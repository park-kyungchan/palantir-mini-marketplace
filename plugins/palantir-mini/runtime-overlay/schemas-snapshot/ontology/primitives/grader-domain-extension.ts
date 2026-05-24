/**
 * @stable — Grader domain extension (prim-data-25, v1.40.0)
 *
 * Extends the existing `RubricDomain` from `grading-criterion.ts` (schemas
 * v1.31.0+) WITHOUT modifying it (rule 08 backcompat). Defines the AIP
 * Evals 19-evaluator-type taxonomy as a separate constant + maps each to
 * one of the 6 canonical RubricDomain values, so consumers can express
 * "this rubric uses an exact-match evaluator" while still routing through
 * the existing 6-domain dispatcher (code/rule/model/human/hybrid/simulator).
 *
 * Why extension, not edit:
 *   `grading-criterion.ts` is consumed by the harness loop (rule 16
 *   v4.0.0 §GradingRubric, plugin v3.10.0+ grader dispatch). Adding new
 *   string literals to the union would be additive at the type level but
 *   would force every existing exhaustive switch to add cases. Keeping
 *   the 6-domain core stable, and exposing the 19-evaluator richer
 *   taxonomy as a separate alias mapped to the 6, lets new rubrics
 *   express AIP Evals fidelity without breaking existing graders.
 *
 * D/L/A domain: DATA (declarative mapping table, no logic).
 *
 * Authority chain:
 *   research/palantir-foundry/aip/
 *     aip-evals-overview-and-ontology-edits-2026-04-14.md
 *     (19 evaluators per 2026-04-14 announcement; full taxonomy across
 *      `aip-evals-create-suite.md`, `aip-evals-intermediate-parameters.md`,
 *      `aip-evals-analyze-run-results.md`)
 *     ↓
 *   schemas/ontology/primitives/grading-criterion.ts (existing — NOT edited)
 *     ↓
 *   schemas/ontology/primitives/grader-domain-extension.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 16 v4.0.0 §GradingRubric, rule 26 v1.0.0 §Axis B
 * (Verifiable — outcome-paired rubric-measurable).
 *
 * @owner palantirkc-ontology
 * @purpose 19-evaluator AIP Evals taxonomy mapped to 6 canonical RubricDomain values
 */

import type { RubricDomain } from "./grading-criterion";

// Re-export RubricDomain for callers who want a single import surface.
export type { RubricDomain } from "./grading-criterion";

/**
 * 19 AIP Evals evaluator types per 2026-04-14 announcement (combined doc
 * + announcement enumerates 19 builtins: 13 listed in announcement +
 * marketplace + ontology-edit-simulator + structural validators).
 *
 * Stable string-literal slugs; ordering follows AIP Evals analyze-run-results
 * documentation flow.
 */
export type AIPEvalsEvaluatorType =
  | "exact-match"
  | "regex"
  | "range"
  | "levenshtein"
  | "keyword-checker"
  | "llm-as-judge"
  | "rouge"
  | "rubric-grader"
  | "contains-key-details"
  | "required-actions-match"
  | "function-backed-custom"
  | "ontology-edit-simulator"
  | "json-schema-conformance"
  | "embedding-similarity"
  | "exact-set-match"
  | "fuzzy-match"
  | "tool-use-validator"
  | "structured-output-validator"
  | "human-review";

export const AIP_EVALS_EVALUATOR_TYPES: readonly AIPEvalsEvaluatorType[] = [
  "exact-match",
  "regex",
  "range",
  "levenshtein",
  "keyword-checker",
  "llm-as-judge",
  "rouge",
  "rubric-grader",
  "contains-key-details",
  "required-actions-match",
  "function-backed-custom",
  "ontology-edit-simulator",
  "json-schema-conformance",
  "embedding-similarity",
  "exact-set-match",
  "fuzzy-match",
  "tool-use-validator",
  "structured-output-validator",
  "human-review",
] as const;

export function isAIPEvalsEvaluatorType(s: string): s is AIPEvalsEvaluatorType {
  return (AIP_EVALS_EVALUATOR_TYPES as readonly string[]).includes(s);
}

/**
 * Mapping from AIP Evals 19-evaluator taxonomy to the 6 canonical
 * RubricDomain values. Each evaluator routes to exactly one domain — that
 * is the dispatcher contract.
 *
 * Mapping rationale:
 *   code      — deterministic shell-runnable evaluators (exact-match,
 *               regex, range, levenshtein, exact-set-match, fuzzy-match —
 *               all expressible as pure functions over (actual, expected)
 *               returning bool/score).
 *   rule      — schema/keyword/structured-output evaluators (keyword-
 *               checker, json-schema-conformance, structured-output-
 *               validator, tool-use-validator, required-actions-match).
 *   model     — LLM-judge evaluators (llm-as-judge, rubric-grader,
 *               contains-key-details, embedding-similarity, rouge).
 *   human     — manual review (human-review).
 *   hybrid    — function-backed-custom (composes ≥2 of above; user-defined
 *               combinator).
 *   simulator — ontology-edit-simulator (transient graph copy + impact
 *               radius scoring; unique to AIP Evals).
 */
export const AIP_EVALS_EVALUATOR_TYPE_TO_RUBRIC_DOMAIN: Record<
  AIPEvalsEvaluatorType,
  RubricDomain
> = {
  "exact-match": "code",
  regex: "code",
  range: "code",
  levenshtein: "code",
  "exact-set-match": "code",
  "fuzzy-match": "code",
  "keyword-checker": "rule",
  "json-schema-conformance": "rule",
  "structured-output-validator": "rule",
  "tool-use-validator": "rule",
  "required-actions-match": "rule",
  "llm-as-judge": "model",
  "rubric-grader": "model",
  "contains-key-details": "model",
  "embedding-similarity": "model",
  rouge: "model",
  "human-review": "human",
  "function-backed-custom": "hybrid",
  "ontology-edit-simulator": "simulator",
};

/**
 * Helper — given an evaluator type, return its canonical RubricDomain.
 * Centralizes the mapping so callers don't read the table directly.
 */
export function rubricDomainForEvaluator(
  evaluator: AIPEvalsEvaluatorType,
): RubricDomain {
  return AIP_EVALS_EVALUATOR_TYPE_TO_RUBRIC_DOMAIN[evaluator];
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "over-specified",
  foundryType: "AIP Evals 19-evaluator → 6-RubricDomain mapping",
  extensions: ["hybrid", "simulator", "visual rubric domains"],
};
export { categoryFoundryEquivalent as graderDomainExtensionFoundryEquivalent };
