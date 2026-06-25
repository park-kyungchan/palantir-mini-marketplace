// palantir-mini — t4-promotion-trigger hook (sprint-062 W2-α)
// Fires on: Stop (Claude Code session end)
//
// PURPOSE: At session end, run the offline grade-promotion replay over the
// project's events.jsonl. This closes Sink-2: T1→T2→T3 promotions that were
// never finalized are appended as NEW promotedFrom rows (append-only), so
// graded value does not silently expire at session end.
//
// The replay is append-only + idempotent (promotedFrom dedup via the effective
// grade index): a 2nd consecutive run promotes 0 and writes no duplicates.
//
// SOLO-DEV CEILING: this trigger drives T1→T2→T3 only. It never calls
// promoteT3ToT4 and never injects a kLlmConsensus marker — T4 stays
// gated-but-correct (single-vendor input cannot self-attest dual-vendor
// canonical consensus). T3→T4 remains a deliberate, separately-evidenced step.
//
// This hook is advisory (Stop, async) — it never blocks session end.
//
// Bypass: PALANTIR_MINI_PROMOTE_DISABLE=1 (audited via
//   value_grade_promotion_bypass on validation_phase_completed).
//
// Authority:
//   rule 26 v1.3.0 §Substrate routing — graded value routed by replay
//   sprint-062 W2-α plan §t4-promotion-trigger
//   rule 10 v2.2.0 §append-only invariant

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { replayPromoteGrades } from "../scripts/replay-promote-grades";
import { reflectMemoryToCache } from "../lib/runtime-overlay/memory-reflect";

// ─── Hook input shape (Stop stdin) ───────────────────────────────────────────

interface StopPayload {
  cwd?:        string;
  session_id?: string;
  reason?:     string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Discover the project root from multiple sources (priority order):
 * 1. PALANTIR_MINI_PROJECT env var
 * 2. hook payload cwd
 * 3. process.cwd()
 */
function resolveProject(payload: StopPayload): string {
  return (
    process.env.PALANTIR_MINI_PROJECT ??
    payload.cwd ??
    process.cwd()
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Read hook payload from stdin
  let rawInput = "";
  for await (const chunk of process.stdin) rawInput += chunk;

  let payload: StopPayload = {};
  try {
    payload = JSON.parse(rawInput) as StopPayload;
  } catch {
    // Malformed input — exit cleanly (Stop hook, advisory)
    process.exit(0);
  }

  const project = resolveProject(payload);
  const cwd     = project;

  // ─── Bypass path (audited) ──────────────────────────────────────────────────
  if (process.env.PALANTIR_MINI_PROMOTE_DISABLE === "1") {
    process.stderr.write(
      `[t4-promotion-trigger] bypassed (PALANTIR_MINI_PROMOTE_DISABLE=1)\n`,
    );
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     true,
        errorClass: "value_grade_promotion_bypass",
      },
      toolName:     "t4-promotion-trigger",
      cwd,
      sessionId:    payload.session_id,
      identity:     "monitor",
      reasoning:    "t4-promotion-trigger: bypass via PALANTIR_MINI_PROMOTE_DISABLE=1",
      memoryLayers: ["episodic", "procedural"],
    }).catch(() => { /* best-effort emit */ });
    process.exit(0);
  }

  // Read events.jsonl
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) {
    // No events file — nothing to promote
    process.exit(0);
  }

  // Run the offline grade-promotion replay (append-only + idempotent).
  // T1→T2→T3 only — promoteT3ToT4 is never invoked here (solo-dev ceiling).
  let result: Awaited<ReturnType<typeof replayPromoteGrades>>;
  try {
    result = await replayPromoteGrades({ projectRoot: project, dryRun: false });
  } catch (err) {
    process.stderr.write(
      `[t4-promotion-trigger] replayPromoteGrades error: ${String(err)}\n`,
    );
    // Emit failure event (best-effort)
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     false,
        errorClass: "value_grade_promotion_error",
      },
      toolName:     "t4-promotion-trigger",
      cwd,
      sessionId:    payload.session_id,
      identity:     "monitor",
      reasoning:    `t4-promotion-trigger: replayPromoteGrades threw: ${String(err)}`,
      memoryLayers: ["episodic", "procedural"],
    }).catch(() => { /* best-effort emit */ });
    process.exit(0);
  }

  const { promotedCount, byTransition } = result;

  // Build Lead recap digest (written to stderr for Lead pm_recap visibility)
  const digest = [
    `\n[t4-promotion-trigger] SESSION-END VALUE-GRADE PROMOTION DIGEST`,
    `  promoted (appended rows): ${promotedCount}`,
    `  by transition:`,
    `    T1→T2: ${byTransition.t1ToT2}`,
    `    T2→T3: ${byTransition.t2ToT3}`,
    `    T3→T4: ${byTransition.t3ToT4}`,
    `  Rule 26 §Substrate routing — promotion rows are append-only (originals unchanged).`,
  ].join("\n");

  process.stderr.write(digest + "\n");

  // Emit ONE summary event for pm_recap (in-band emit; emit_event stays hidden).
  await emit({
    type:    "validation_phase_completed",
    payload: {
      phase:      "post_write",
      passed:     true,
      errorClass: "value_grade_promotion_completed",
    },
    toolName:     "t4-promotion-trigger",
    cwd,
    sessionId:    payload.session_id,
    identity:     "monitor",
    reasoning:    `t4-promotion-trigger session-end replay complete. promoted=${promotedCount} t1ToT2=${byTransition.t1ToT2} t2ToT3=${byTransition.t2ToT3} t3ToT4=${byTransition.t3ToT4} (append-only + idempotent).`,
    memoryLayers: ["episodic", "procedural"],
  });

  // ─── Sink-1 WRITE: reflect prior digest to the pm-owned cache file ──────────
  // Best-effort, isolated try/catch — never affects the Stage-2 promotion path
  // or session-end continuation. Writes a hash-gated digest into the dedicated
  // .palantir-mini/cache/memory-prior.md (the curated MEMORY.md is untouched).
  try {
    await reflectMemoryToCache(project);
  } catch (err) {
    process.stderr.write(
      `[t4-promotion-trigger] reflectMemoryToCache error: ${String(err)}\n`,
    );
  }

  // Advisory hook — always continue (Stop hooks are non-blocking)
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[t4-promotion-trigger] fatal: ${String(err)}\n`);
  process.exit(0); // Advisory — never block on failure
});
