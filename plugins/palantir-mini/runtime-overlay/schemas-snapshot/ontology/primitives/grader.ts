/**
 * @stable — Grader primitive (prim-harness-11, v1.0.0)
 *
 * Alias-wrapper linking the three split grader primitives (grading-criterion.ts,
 * grader-effort.ts, grader-domain-extension.ts) into a unified runtime-side
 * dispatch identity. The split is intentional (composable); this wrapper adds
 * the canonical `GraderRid` brand + `GraderDeclaration` composite that links
 * the three existing primitives by reference.
 *
 * `GraderDeclaration` is the dispatch-time identity: "which criterion does
 * this grader serve, at what effort tier, in which domain?". The three
 * existing primitives retain their independent semantics — this wrapper does
 * NOT collapse them.
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 5.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/grading-criterion.ts (criterionRef)
 *     -> ~/.claude/schemas/ontology/primitives/grader-effort.ts (tier)
 *     -> ~/.claude/schemas/ontology/primitives/grader-domain-extension.ts (domain)
 *     -> ~/.claude/schemas/ontology/primitives/grader.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: DATA (dispatch identity record — composites three existing primitives)
 * @owner palantirkc-ontology
 * @purpose Grader canonical composite for runtime dispatch identity (Phase 2 ImpactGraph node)
 */

import type { GradingCriterionRid } from "./grading-criterion";
import type { GraderEffortLevel } from "./grader-effort";
import type { AIPEvalsEvaluatorType } from "./grader-domain-extension";

export type { GradingCriterionRid } from "./grading-criterion";
export type { GraderEffortLevel } from "./grader-effort";
export type { AIPEvalsEvaluatorType } from "./grader-domain-extension";

export type GraderRid = string & { readonly __brand: "GraderRid" };
export const graderRid = (s: string): GraderRid => s as GraderRid;

export interface GraderDeclaration {
  readonly graderId: GraderRid;
  /** RID of the GradingCriterion this grader scores. */
  readonly criterionRef: GradingCriterionRid;
  /** Effort tier governing model selection at dispatch time. */
  readonly tier: GraderEffortLevel;
  /** AIP Evals evaluator type identifying the grader domain. */
  readonly domain: AIPEvalsEvaluatorType;
}

export function isGraderDeclaration(x: unknown): x is GraderDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as GraderDeclaration;
  return (
    typeof d.graderId === "string" &&
    d.graderId.length > 0 &&
    typeof d.criterionRef === "string" &&
    typeof d.tier === "string" &&
    typeof d.domain === "string"
  );
}
