// palantir-mini v0 — PreCompact hook handler
// Fires on: PreCompact (before Claude context compaction)
//
// Responsibilities:
//   1. Check that ontology invariants hold before compaction
//   2. If invariants fail, return decision:"block" (v2.1.105 feature)
//   3. Otherwise emit a session_ended-style checkpoint for lineage
//
// PreCompact uses top-level `decision` (NOT hookSpecificOutput.permissionDecision).
// That field applies to PreToolUse only.

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot, eventsPathFor } from "../scripts/log";
import { readEvents, foldToSnapshot } from "../lib/event-log/read";
import { snapshotEventsRaw, pruneRawSnapshots } from "../lib/event-log/snapshot";
import { freezeActiveContextCapsule } from "../lib/context/context-capsule";

interface HookOutput {
  decision?: "block" | "continue";
  reason?:   string;
  suppressOutput?: boolean;
}

export default async function preCompactState(_payload: unknown): Promise<HookOutput> {
  // Invariants + side-effects per rule 10 §PreCompact gate:
  //   1. events.jsonl exists and is valid NDJSON (advisory continue if missing)
  //   2. foldToSnapshot succeeds
  //   3. lastSequence matches the line count (no gaps) → block on mismatch
  //   4. v3.2.0 D2: copy raw events.jsonl to <sessionDir>/snapshots/ for loss safety
  //   5. v3.2.0 G4: prune snapshots beyond keepCount=20 OR maxAgeMs=7d (whichever larger)
  //   6. emit phase_completed checkpoint + snapshot_written for BackwardProp
  try {
    const root  = projectRoot();
    const epath = eventsPathFor(root);
    if (!fs.existsSync(epath)) {
      // No events.jsonl yet — nothing to guard
      return { decision: "continue" };
    }

    const events = readEvents(epath);
    const snap = foldToSnapshot(events);

    if (snap.lastSequence !== events.length) {
      return {
        decision: "block",
        reason: `palantir-mini: events.jsonl invariant failed — lastSequence=${snap.lastSequence} but events.length=${events.length} (gap or reorder). Investigate before compaction.`,
      };
    }

    // v3.2.0 D2: raw NDJSON snapshot to <sessionDir>/snapshots/events-<ISO>.jsonl
    // Rule 10 §PreCompact gate guarantees this — pre-v3.2.0 was unimplemented.
    const snapshotDir = path.join(root, ".palantir-mini", "session", "snapshots");
    let snapshotResult: ReturnType<typeof snapshotEventsRaw> | null = null;
    try {
      snapshotResult = snapshotEventsRaw(epath, snapshotDir);
    } catch (snapErr) {
      // Best-effort — log to stderr but do NOT block compaction on snapshot failure.
      process.stderr.write(`[palantir-mini/pre-compact-state] snapshot failed: ${(snapErr as Error).message}\n`);
    }

    // v3.2.0 G4: retention bounds disk growth (default 20 keep / 7d age, whichever larger)
    try {
      pruneRawSnapshots(snapshotDir);
    } catch { /* best-effort */ }

    // v1.35.0 / rule 26 §R2 — 30s idempotency for pre_compact_checkpoint emit.
    // PreCompact can fire repeatedly during a long session; suppress within
    // a 30s window unless lastSequence has advanced. Tag memoryLayers
    // ["episodic", "working"] — checkpoint marks an episodic boundary AND
    // the working memory state at that moment.
    const RECENT_WINDOW_MS = 30_000;
    const recentCheckpoint = events
      .slice(Math.max(0, events.length - 50))
      .find((e) => {
        const r = e as { type?: string; when?: string; payload?: { phaseTag?: string } };
        return (
          r.type === "phase_completed" &&
          r.payload?.phaseTag === "pre_compact_checkpoint" &&
          typeof r.when === "string" &&
          Date.now() - Date.parse(r.when) < RECENT_WINDOW_MS
        );
      });

    // Emit checkpoint events for BackwardProp lineage (suppress if recent)
    if (!recentCheckpoint) {
      try {
        await emit({
          type: "phase_completed",
          payload: {
            phaseTag: "pre_compact_checkpoint",
            taskId:   "pre-compact",
            validations: ["sequence_monotonic", "events_count_match"],
          },
          toolName: "PreCompact",
          cwd: process.cwd(),
          identity: "claude-code",
          memoryLayers: ["episodic", "working"],
          reasoning: "PreCompact checkpoint; episodic boundary + working memory snapshot before compaction.",
        });
      } catch {
        // best-effort — never block compaction on event-log write failure
      }
    }

    if (snapshotResult !== null) {
      try {
        await emit({
          type: "snapshot_written",
          payload: {
            path:       snapshotResult.path,
            sizeBytes:  snapshotResult.sizeBytes,
            atSequence: snapshotResult.atSequence,
          },
          toolName: "PreCompact",
          cwd: process.cwd(),
          identity: "monitor",
          memoryLayers: ["episodic"],
          reasoning: "rule 10 §PreCompact gate raw NDJSON snapshot (v3.2.0 D2); episodic memory archive.",
        });
      } catch { /* best-effort */ }
    }

    try {
      const frozenCapsule = await freezeActiveContextCapsule(root, "precompact");
      if (frozenCapsule !== null && snapshotResult !== null) {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase: "runtime",
            passed: true,
            errorClass: "context_capsule_frozen",
            capsuleId: frozenCapsule.capsuleId,
            capsulePath: path.join(root, ".palantir-mini", "session", "context-capsules", `${frozenCapsule.capsuleId}.json`),
            snapshotPath: snapshotResult.path,
          } as Record<string, unknown>,
          toolName: "PreCompact",
          cwd: root,
          identity: "monitor",
          memoryLayers: ["working", "episodic"],
          // promotion-linkage wave 4 (needs-context-plumbing site 9) — additive
          // correlation-rid stamp; capsuleId-class.
          lineageRefs: { actionRid: frozenCapsule.capsuleId },
          reasoning: "PreCompact froze the active context capsule and attached its path to the compaction snapshot lineage.",
        });
      }
    } catch { /* best-effort — capsule freeze must never block compaction */ }

    // W2.2 (sprint-027) — proactive /palantir-mini:pm-value-audit suggestion at
    // PreCompact gate. Compact resets working memory; if T2+ ratio is below
    // rule 26 alarm threshold (15%), this is the moment to surface substrate
    // health for user review BEFORE context disappears. Best-effort scan via
    // pm_value_grade_metrics is too heavy for hook latency budget; instead a
    // lightweight inline ratio computation from the same events array is used.
    try {
      const sample = readEvents(epath).slice(-1000);
      if (sample.length > 0) {
        const t2plus = sample.filter((e) => {
          const g = (e as { valueGrade?: string }).valueGrade;
          return g === "T2" || g === "T3" || g === "T4";
        }).length;
        const ratio = t2plus / sample.length;
        if (ratio < 0.15) {
          const { emitSkillSuggestion } = await import("../lib/skill-suggestion-emit");
          await emitSkillSuggestion({
            suggestedSkillSlug: "pm-value-audit",
            suggestedByHook:    "pre-compact-state",
            triggerCondition:   `T2+ ratio ${(ratio * 100).toFixed(1)}% < 15% rule 26 alarm threshold (sample=${sample.length})`,
            suggestionContext:  epath,
            memoryLayers:       ["semantic", "procedural"],
            cwd: process.cwd(),
          });
        }
      }
    } catch { /* best-effort — substrate-health advisory must never block compaction */ }

    return { decision: "continue" };
  } catch (e) {
    // If we cannot evaluate invariants, default to continue rather than blocking
    return {
      decision: "continue",
      reason: `palantir-mini: PreCompact invariant check threw (${(e as Error).message}) — continuing to avoid false-positive block`,
    };
  }
}
