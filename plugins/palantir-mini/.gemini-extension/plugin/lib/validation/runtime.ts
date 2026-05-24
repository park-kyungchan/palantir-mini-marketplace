/**
 * Phase 5: Runtime validation
 * @owner palantirkc-plugin-validation
 * @purpose Phase 5: Runtime validation
 */
// palantir-mini v0 — Phase 5: Runtime validation
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — phase "runtime")
// Mirrors Palantir §VAL.R-07 (Runtime).
//
// Runs on: MCP commit_edits pre-flight via submission criteria evaluator.
// This phase is the submission criteria gate — LOGIC computation + SECURITY
// gate semantics — applied BEFORE the atomic commit. Returns pass/fail per
// criterion + an overall verdict.

import type { OntologyEdit } from "../event-log/types";
import { evaluateCriteria, type SubmissionCriterion } from "../actions/submission-criteria";
import type { PhaseResult } from "./design";

export interface RuntimeOptions {
  edits:     OntologyEdit[];
  criteria:  SubmissionCriterion[];
}

export async function runRuntimePhase(opts: RuntimeOptions): Promise<PhaseResult> {
  const t0 = Date.now();
  const result = evaluateCriteria(opts.edits, opts.criteria);

  const errors   = result.results.filter((r) => !r.passed).map((r) => `${r.name} [${r.type}]: ${r.reason ?? "failed"}`);
  const warnings: string[] = [];

  return {
    phase: "runtime",
    passed: result.allPassed,
    errorClass: result.allPassed ? undefined : "runtime_submission_criteria_failed",
    errors,
    warnings,
    durationMs: Date.now() - t0,
  };
}
