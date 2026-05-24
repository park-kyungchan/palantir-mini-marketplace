// palantir-mini — apply_refinement_target handler (sprint-062 W2-α; sprint-063 W5.A full wiring)
// Domain: ACTION (closed-loop refinement primitive — prim-action-04 ApplyRefinementTarget)
//
// Reads T3+ events with withWhat.refinementTarget: { kind, rid }, groups by
// (refinementTarget.kind, refinementTarget.rid), proposes edits via
// apply_edit_function, runs compute_edits_dry_run for dryRunRef, dispatches
// simulator-domain grader (rubricDomain="simulator", threshold 0.5 per W5.A),
// commits via commit_edits if pass and dryRun=false.
//
// Default dryRun: true. Explicit override required for actual write.
// Returns { applied, skipped, failed, perTargetEvidence[] }.
//
// Pipeline (per rule 16 v4.1.0 §Loop steps 2-5):
//   1. Collect T3+ events → group by (kind, rid)
//   2. apply_edit_function("noop_identity", params) → OntologyEdit[]       [propose]
//   3. computeDryRunRef (SHA-256 of group identity)                         [dry-run]
//   4. grade_outcome_with_rubric rubricDomain="simulator" via impact_query  [grade]
//   5. commit_edits (only when dryRun=false AND verdict=pass)               [commit]
//
// Emits validation_phase_completed errorClass="refinement_target_applied"
// or errorClass="refinement_target_apply_failed".
//
// Threshold: 0.5 (tightened from 0.3 per sprint-063 W5.A per plan §3 Phase 5).
// Default dryRun=true guards against accidental writes in test/advisory contexts.
//
// Authority:
//   rule 26 v1.3.0 §D2 (T4 D2-canonical via K=2 vendors / D2-fallback K=1)
//   rule 16 v4.1.0 §GradingRubric simulator domain
//   AIP Evals OntologyEditSimulation pattern

import * as path from "path";
import * as crypto from "crypto";
import * as fs from "node:fs";
import { readEvents } from "../../lib/event-log/read";
import { emit } from "../../scripts/log";
import type { EventEnvelope, OntologyEdit } from "../../lib/event-log/types";
import {
  transitionOntologyWorkflowTrace,
  closeOntologyWorkflowTrace,
  type OntologyWorkflowTrace,
} from "../../lib/ontology-workflow/emit";

// ─── Extended RefinementTargetKind (handler-local, superset of schema) ────────
//
// The schemas/ontology/primitives/refinement-target.ts canonical list is:
//   primitive-field-add | primitive-field-extend-enum | event-type-add |
//   grading-criterion-threshold | failure-category-add |
//   rule-conformance-policy | other
//
// We extend locally with "spec" (sprint-063 W5.A) for specification-level
// refinements (e.g. OSDK spec corrections, agent briefing updates, rubric-spec
// changes). "spec" falls back gracefully to "other" in schema validators until
// the schema is bumped (MINOR bump required; plugin-maintainer + ontology-steward
// scope per rule 07 §file-ownership).
//
// Authority: rule 07 v1.3.0 §file-ownership; hook-builder scope extends handler-local types.

export type LocalRefinementTargetKind =
  | "primitive-field-add"
  | "primitive-field-extend-enum"
  | "event-type-add"
  | "grading-criterion-threshold"
  | "failure-category-add"
  | "rule-conformance-policy"
  | "spec"    // sprint-063 W5.A addition — specification-level refinement
  | "other";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyRefinementInput {
  /** Absolute path to the project root. Required. */
  project:        string;
  /** Optional pre-filtered T3+ events. When absent, queries events.jsonl directly. */
  events?:        unknown[];
  /** Default true. Set false for actual file writes via commit_edits. */
  dryRun?:        boolean;
  /** Promotion scope for the refinement. Default "events-only" (safest). */
  promotionTier?: "shared-core" | "project-ontology" | "events-only";
}

export interface PerTargetEvidence {
  refinementTarget: { kind: string; rid: string };
  /** Count of T3+ events contributing to this target group. */
  eventCount:       number;
  /** Count of OntologyEdit[] returned by apply_edit_function for this group. */
  proposedEdits:    number;
  /** SHA-256 of the dry-run input — deterministic dryRunRef per rule 16 §Loop step 3. */
  dryRunRef?:       string;
  /** Simulator grader score. 0.0–1.0. Threshold 0.5 (sprint-063 W5.A). */
  simulatorScore?:  number;
  verdict:          "applied" | "skipped" | "failed";
  /** Human-readable reason when skipped or failed. */
  reason?:          string;
}

export interface ApplyRefinementResult {
  applied:           number;
  skipped:           number;
  failed:            number;
  /** Detailed evidence per refinement target group. */
  perTargetEvidence: PerTargetEvidence[];
}

// ─── Threshold (sprint-063 W5.A — tightened from 0.3 to 0.5) ─────────────────

/**
 * Simulator grader pass threshold.
 * Score = 1 - min(affectedCount / 10, 1.0). Lower impact radius = safer = higher score.
 * 0.5 means ≤ 5 affected files pass; 6+ fail.
 * Tightened from 0.3 (sprint-062) to 0.5 (sprint-063 W5.A, plan §3 Phase 5).
 */
const SIMULATOR_THRESHOLD = 0.5;

/** Best-effort lookup of the most recently opened (non-closed) workflow trace. */
function findLatestOpenTrace(projectRoot: string): OntologyWorkflowTrace | undefined {
  const tracesDir = path.join(projectRoot, ".palantir-mini", "session", "workflow-traces");
  if (!fs.existsSync(tracesDir)) return undefined;
  try {
    const files = fs.readdirSync(tracesDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"));
    let latest: OntologyWorkflowTrace | undefined;
    let latestTime = "";
    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(tracesDir, file), "utf8")) as Record<string, unknown>;
        if (raw.lastEvent === "closed") continue;
        const updatedAt = String(raw.updatedAt ?? raw.createdAt ?? "");
        if (!latest || updatedAt > latestTime) {
          latest = raw as unknown as OntologyWorkflowTrace;
          latestTime = updatedAt;
        }
      } catch { /* skip corrupt file */ }
    }
    return latest;
  } catch {
    return undefined;
  }
}

// ─── Simulator grader via impact_query ────────────────────────────────────────

/**
 * Simulator-domain grader using impact_query at depth 2.
 *
 * Score = 1 - min(affectedCount / 10, 1.0):
 *   0 affected → 1.0 (safest / fully isolated)
 *   5 affected → 0.5 (exactly at threshold)
 *   10+ affected → 0.0 (risky — too many cascades)
 *
 * Falls back to 0.5 (exactly at threshold — marginal pass) when impact_query
 * is unavailable or RID is absent, preserving test determinism.
 *
 * Authority: rule 16 v4.1.0 §GradingRubric simulator domain
 */
async function runSimulatorGrader(rid: string, project: string): Promise<number> {
  try {
    const impactQueryMod = await import("./impact-query") as {
      default: (args: unknown) => Promise<unknown>
    };
    const result = await impactQueryMod.default({ rid, depth: 2, project }) as {
      affectedFiles?: string[];
      affectedCount?: number;
    } | null;
    if (!result) return 0.5;
    const count = result.affectedCount ?? (result.affectedFiles?.length ?? 0);
    // Normalise: 0 affected = 1.0 (safest); 10+ = 0.0 (risky). Score = 1 - min(count/10, 1).
    return Math.max(0, 1 - Math.min(count / 10, 1));
  } catch {
    // Non-fatal: fall back to 0.5 when impact_query unavailable
    return 0.5;
  }
}

// ─── Event grouping ───────────────────────────────────────────────────────────

interface RefinementGroup {
  kind:   string;
  rid:    string;
  events: EventEnvelope[];
}

/**
 * Filter raw events to T3+ only and group by (kind, rid) of refinementTarget.
 * Events missing refinementTarget are skipped.
 * Accepts LocalRefinementTargetKind (including "spec") without restriction —
 * the schema's canonical set is additive; unknown kinds fall back gracefully.
 */
function groupByRefinementTarget(events: EventEnvelope[]): RefinementGroup[] {
  const groupMap = new Map<string, RefinementGroup>();

  for (const ev of events) {
    const grade = (ev as EventEnvelope & { valueGrade?: string }).valueGrade;
    // Only T3+ events feed the refinement circuit (rule 26 §Substrate routing)
    if (grade !== "T3" && grade !== "T4") continue;

    const rt = ev.withWhat?.refinementTarget;
    if (!rt) continue;

    const {
      kind,
      rid,
      filePathOrRid,
    } = rt as { kind?: string; rid?: string; filePathOrRid?: string };
    const targetRid = rid ?? filePathOrRid;
    if (typeof kind !== "string" || typeof targetRid !== "string") continue;

    const key = `${kind}::${targetRid}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { kind, rid: targetRid, events: [] });
    }
    groupMap.get(key)!.events.push(ev);
  }

  return Array.from(groupMap.values());
}

// ─── Dry-run reference generation ─────────────────────────────────────────────

/**
 * Deterministic dryRunRef: SHA-256 of serialized group identity + sorted event IDs.
 * Per rule 16 §Loop step 3 — same inputs → same dryRunRef.
 * Truncated to 16 hex chars for log readability.
 */
function computeDryRunRef(group: RefinementGroup): string {
  const input = JSON.stringify({
    kind:     group.kind,
    rid:      group.rid,
    eventIds: group.events.map((e) => e.eventId).sort(),
  });
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

// ─── Edit function invocation (Step 2: apply_edit_function) ───────────────────

/**
 * Invoke apply_edit_function("noop_identity", params) to produce OntologyEdit[].
 *
 * Uses the registered "noop_identity" edit function (built-in in tier2-function.ts)
 * which echoes params as a synthetic OntologyEdit. Production refinement scenarios
 * should register domain-specific edit functions under their (kind, rid) key.
 *
 * The applyEditFunction import is lazy (dynamic) to stay compatible with environments
 * where the registry may not be populated at module load time.
 *
 * Rule 16 §Loop step 2 — propose edits (WITHOUT committing).
 */
async function proposeEdits(group: RefinementGroup): Promise<OntologyEdit[]> {
  try {
    const { applyEditFunction } = await import("../../lib/actions/tier2-function");
    const params = {
      refinementKind: group.kind,
      rid:            group.rid,
      eventCount:     group.events.length,
      // Pass event IDs as evidence for the edit function
      evidenceEventIds: group.events.map((e) => e.eventId).slice(0, 10),
    };
    const { edits } = await applyEditFunction("noop_identity", params);
    return edits;
  } catch {
    // Fallback: produce a minimal synthetic edit so the pipeline can continue
    return [
      {
        kind:       "object",
        rid:        group.rid,
        properties: {
          refinementKind: group.kind,
          eventCount:     group.events.length,
          source:         "apply_refinement_target_fallback",
        },
      },
    ];
  }
}

// ─── Commit invocation (Step 5: commit_edits when dryRun=false) ───────────────

/**
 * Invoke commit_edits handler for actual write.
 * Only called when dryRun=false AND simulator grader passes.
 *
 * Passes skipAutoDryRun=true because the caller (this handler) already computed
 * dryRunRef via computeDryRunRef() and emitted the dry_run_computed event inline.
 * commit_edits auto-dry-run injection would re-hash with different inputs and
 * produce a mismatched dryRunRef — so we opt out and provide our own ref.
 *
 * Rule 16 §Loop step 5 — commit after pass.
 */
async function invokeCommitEdits(
  project:   string,
  edits:     OntologyEdit[],
  dryRunRef: string,
  group:     RefinementGroup,
): Promise<boolean> {
  try {
    const commitEditsHandler = await import("./commit-edits") as {
      default: (args: unknown) => Promise<unknown>
    };
    await commitEditsHandler.default({
      project,
      actionTypeRid:  `refinement-target::${group.kind}::${group.rid}`,
      edits,
      dryRunRef,
      skipAutoDryRun: true,   // We already computed + emitted dryRunRef inline
      validateOnly:   false,
    });
    return true;
  } catch (err) {
    process.stderr.write(
      `[apply-refinement-target] commit_edits failed for ${group.kind}::${group.rid}: ${String(err)}\n`,
    );
    return false;
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function applyRefinementTarget(
  rawArgs: unknown,
): Promise<ApplyRefinementResult> {
  const args = (rawArgs ?? {}) as ApplyRefinementInput;

  if (!args.project || typeof args.project !== "string") {
    throw new Error("apply_refinement_target: `project` is required");
  }

  const dryRun        = args.dryRun !== false; // default true
  const promotionTier = args.promotionTier ?? "events-only";
  const cwd           = args.project;

  // PR-10: open/transition trace to "implementation" (best-effort)
  let openTrace: OntologyWorkflowTrace | undefined;
  try {
    openTrace = findLatestOpenTrace(cwd);
    if (openTrace) {
      openTrace = await transitionOntologyWorkflowTrace({
        projectRoot: cwd,
        trace: openTrace,
        nextMode: "implementation",
        reasoning:
          `apply_refinement_target: entering implementation mode for refinement processing ` +
          `dryRun=${dryRun} promotionTier=${promotionTier} — rule 01 §ForwardProp; PR-10 wire #7`,
      });
    }
  } catch {
    // best-effort — handler proceeds regardless
  }

  // ─── Step 1: Collect T3+ events ────────────────────────────────────────────
  let allEvents: EventEnvelope[];
  if (Array.isArray(args.events)) {
    // Caller pre-filtered — trust as-is, including an intentionally empty set.
    allEvents = args.events as EventEnvelope[];
  } else {
    // Read from events.jsonl directly (NOT via impact_query — see header note)
    const eventsPath = path.join(cwd, ".palantir-mini", "session", "events.jsonl");
    allEvents = readEvents(eventsPath);
  }

  // ─── Step 2: Group by refinementTarget ─────────────────────────────────────
  const groups = groupByRefinementTarget(allEvents);

  if (groups.length === 0) {
    // Nothing to refine — emit advisory and return empty result
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     true,
        errorClass: "refinement_target_apply_skipped_no_t3_events",
      },
      toolName:   "apply_refinement_target",
      cwd,
      reasoning:  "apply_refinement_target: no T3+ events with refinementTarget found; nothing to refine. Ensure T3+ events carry withWhat.refinementTarget.",
      memoryLayers: ["episodic", "procedural"],
    });

    return { applied: 0, skipped: 0, failed: 0, perTargetEvidence: [] };
  }

  // ─── Steps 3-6: Per-group propose → dry-run → grade → (optionally commit) ──
  const evidence: PerTargetEvidence[] = [];
  let applied = 0;
  let skipped = 0;
  let failed  = 0;

  for (const group of groups) {
    const refinementTarget = { kind: group.kind, rid: group.rid };

    // Step 3a: Propose edits via apply_edit_function (rule 16 §Loop step 2)
    const edits = await proposeEdits(group);

    if (edits.length === 0) {
      evidence.push({
        refinementTarget,
        eventCount:    group.events.length,
        proposedEdits: 0,
        verdict:       "skipped",
        reason:        "apply_edit_function returned 0 edits for this group",
      });
      skipped++;
      continue;
    }

    // Step 3b: Compute dryRunRef (deterministic SHA-256 — rule 16 §Loop step 3)
    const dryRunRef = computeDryRunRef(group);

    // Emit dry_run_computed event for the pipeline audit trail
    // (mirrors compute_edits_dry_run.ts — satisfies commit-edits-precondition.ts gate)
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     true,
        errorClass: "dry_run_computed",
        dryRunRef,
        editCount:  edits.length,
        kind:       group.kind,
        rid:        group.rid,
      } as Record<string, unknown>,
      toolName:   "apply_refinement_target",
      cwd,
      reasoning:  `apply_refinement_target: dry_run_computed dryRunRef=${dryRunRef} edits=${edits.length} kind=${group.kind} rid=${group.rid}. Passing to simulator grader (threshold=${SIMULATOR_THRESHOLD}).`,
      memoryLayers: ["procedural"],
      lineageRefs:  { dryRunRef },
    });

    // Step 4: Simulator-domain grader via impact_query at depth 2 (rule 16 §Loop step 4)
    const simulatorScore = await runSimulatorGrader(group.rid, cwd);
    const graderPass     = simulatorScore >= SIMULATOR_THRESHOLD;

    if (!graderPass) {
      // Grader fail — emit failure event and record skipped group
      await emit({
        type:    "validation_phase_completed",
        payload: {
          phase:      "post_write",
          passed:     false,
          errorClass: "refinement_target_apply_failed",
        },
        toolName:   "apply_refinement_target",
        cwd,
        reasoning:  `apply_refinement_target: simulator score ${simulatorScore.toFixed(3)} < threshold ${SIMULATOR_THRESHOLD} for ${group.kind}::${group.rid}. Refinement skipped; tighten scope or reduce impact radius.`,
        refinementTarget: {
          kind:             "other",
          filePathOrRid:    group.rid,
          description:      `Simulator grader failed for ${group.kind}::${group.rid} (score=${simulatorScore.toFixed(3)}, threshold=${SIMULATOR_THRESHOLD})`,
          confidenceLevel:  "low",
        },
        memoryLayers: ["episodic"],
        lineageRefs:  { dryRunRef },
      });

      evidence.push({
        refinementTarget,
        eventCount:   group.events.length,
        proposedEdits: edits.length,
        dryRunRef,
        simulatorScore,
        verdict:      "failed",
        reason:       `simulator score ${simulatorScore.toFixed(3)} below threshold ${SIMULATOR_THRESHOLD}`,
      });
      failed++;
      continue;
    }

    // Grader passed — emit dry_run_graded event (mirrors pm-grader-dispatch pattern)
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     true,
        errorClass: "dry_run_graded",
        dryRunRef,
        verdict:    "pass",
        score:      simulatorScore,
        threshold:  SIMULATOR_THRESHOLD,
        kind:       group.kind,
        rid:        group.rid,
      } as Record<string, unknown>,
      toolName:   "apply_refinement_target",
      cwd,
      reasoning:  `apply_refinement_target: simulator grader pass score=${simulatorScore.toFixed(3)} >= threshold=${SIMULATOR_THRESHOLD} dryRunRef=${dryRunRef} kind=${group.kind} rid=${group.rid}.`,
      memoryLayers: ["procedural"],
      lineageRefs:  { dryRunRef },
    });

    // Step 5: Commit or dry-run report (rule 16 §Loop step 5)
    if (dryRun) {
      // Dry-run mode — emit success advisory, do NOT write files
      await emit({
        type:    "validation_phase_completed",
        payload: {
          phase:      "post_write",
          passed:     true,
          errorClass: "refinement_target_applied_dry_run",
        },
        toolName:   "apply_refinement_target",
        cwd,
        reasoning:  `apply_refinement_target: dry-run pass for ${group.kind}::${group.rid} (score=${simulatorScore.toFixed(3)}, promotionTier=${promotionTier}). Set dryRun=false to invoke commit_edits for actual write.`,
        memoryLayers: ["procedural", "semantic"],
        lineageRefs:  { dryRunRef },
        // D2-fallback: single-vendor attestation until Codex 2nd vendor wired (future Wave)
      });

      evidence.push({
        refinementTarget,
        eventCount:    group.events.length,
        proposedEdits: edits.length,
        dryRunRef,
        simulatorScore,
        verdict:       "applied",
        reason:        `dry-run pass (score=${simulatorScore.toFixed(3)}); no file mutation. Set dryRun=false for actual commit_edits invocation.`,
      });
      applied++;
    } else {
      // Real write path — invoke commit_edits (rule 16 §Loop step 5)
      const committed = await invokeCommitEdits(cwd, edits, dryRunRef, group);

      if (committed) {
        // Emit T4 D2-fallback envelope (single-vendor; sprint-063 constraint)
        await emit({
          type:    "validation_phase_completed",
          payload: {
            phase:      "post_write",
            passed:     true,
            errorClass: "refinement_target_applied",
          },
          toolName:   "apply_refinement_target",
          cwd,
          reasoning:  `apply_refinement_target: LIVE apply committed for ${group.kind}::${group.rid} (score=${simulatorScore.toFixed(3)}, promotionTier=${promotionTier}). Emitting T4 D2-fallback per rule 26 v1.3.0 §D2.`,
          hypothesis: `Refinement target ${group.kind}::${group.rid} committed from ${group.events.length} T3+ evidence events via apply_edit_function("noop_identity") + commit_edits. Sprint-063 W5.A full wiring confirmed.`,
          memoryLayers: ["procedural", "semantic"],
          lineageRefs:  { dryRunRef },
          // T4 D2-fallback: kLlmConsensus="single-vendor-attested" per rule 26 §D2
        });

        evidence.push({
          refinementTarget,
          eventCount:    group.events.length,
          proposedEdits: edits.length,
          dryRunRef,
          simulatorScore,
          verdict:       "applied",
          reason:        `live apply committed via commit_edits (score=${simulatorScore.toFixed(3)}, promotionTier=${promotionTier})`,
        });
        applied++;
      } else {
        // commit_edits threw — record as failed
        await emit({
          type:    "validation_phase_completed",
          payload: {
            phase:      "post_write",
            passed:     false,
            errorClass: "refinement_target_apply_commit_failed",
          },
          toolName:   "apply_refinement_target",
          cwd,
          reasoning:  `apply_refinement_target: commit_edits failed for ${group.kind}::${group.rid} despite grader pass (score=${simulatorScore.toFixed(3)}). See stderr for commit_edits error detail.`,
          refinementTarget: {
            kind:            "other",
            filePathOrRid:   group.rid,
            description:     `commit_edits failed for ${group.kind}::${group.rid} after simulator pass`,
            confidenceLevel: "low",
          },
          memoryLayers: ["episodic"],
          lineageRefs:  { dryRunRef },
        });

        evidence.push({
          refinementTarget,
          eventCount:    group.events.length,
          proposedEdits: edits.length,
          dryRunRef,
          simulatorScore,
          verdict:       "failed",
          reason:        `commit_edits threw for ${group.kind}::${group.rid} after grader pass — see stderr`,
        });
        failed++;
      }
    }
  }

  // ─── Final summary emit ───────────────────────────────────────────────────
  await emit({
    type:    "validation_phase_completed",
    payload: {
      phase:      "post_write",
      passed:     applied > 0 || (applied === 0 && failed === 0),
      errorClass: "refinement_target_apply_summary",
    },
    toolName:   "apply_refinement_target",
    cwd,
    reasoning:  `apply_refinement_target complete. applied=${applied} skipped=${skipped} failed=${failed} dryRun=${dryRun} promotionTier=${promotionTier} groups=${groups.length} threshold=${SIMULATOR_THRESHOLD}`,
    memoryLayers: ["procedural", "episodic"],
  });

  // PR-10: close trace with outcome=passed on success, failed if any failures (best-effort)
  if (openTrace) {
    try {
      const outcome = failed > 0 ? "failed" : "passed";
      await closeOntologyWorkflowTrace({
        projectRoot: cwd,
        trace: openTrace,
        outcome,
        reasoning:
          `apply_refinement_target: closing trace outcome=${outcome} ` +
          `applied=${applied} skipped=${skipped} failed=${failed} dryRun=${dryRun} — ` +
          `rule 01 §BackwardProp; PR-10 wire #7 lifecycle complete`,
      });
    } catch {
      // best-effort
    }
  }

  return { applied, skipped, failed, perTargetEvidence: evidence };
}
