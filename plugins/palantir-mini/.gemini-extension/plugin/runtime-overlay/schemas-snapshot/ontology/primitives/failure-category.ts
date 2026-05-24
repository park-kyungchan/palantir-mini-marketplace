/**
 * @stable — FailureCategory enum primitive (prim-data-13, v1.32.0)
 *
 * Discriminated string-union categorising harness sprint failure modes.
 * Used by `failure-mode-synthesized.ts` payload + the analyzer-output-injector
 * synthesis step to tag a sprint's root-cause hypothesis with a structured
 * label that downstream queries (sprint-008+ `pm_cross_sprint_pattern_query`)
 * can group on without parsing free-text rationale.
 *
 * Authority chain:
 *   plans/tidy-stargazing-papert.md §Confirmed Decisions Q3 (enum primitive)
 *     ↓
 *   schemas/ontology/primitives/failure-category.ts (this file)
 *     ↓
 *   schemas/ontology/primitives/failure-mode-synthesized.ts (consumer)
 *     ↓
 *   palantir-mini/hooks/analyzer-output-injector.ts (regex emitter)
 *
 * D/L/A domain: DATA (enumeration shape — not a state machine)
 * @owner palantirkc-ontology
 * @purpose Sprint-failure root-cause classification enum
 */

/**
 * Six canonical failure categories observed across harness sprints.
 *
 * - `spec_misalignment`          — generator output diverges from spec intent
 * - `scope_overreach`            — change escapes the sprint scope boundary
 * - `threshold_too_strict`       — rubric criterion sets unrealistic floor
 * - `regression`                 — prior working behavior breaks
 * - `rule_conformance_violation` — rule 12/16/etc. violated
 * - `unknown`                    — analyzer could not categorise (default)
 */
export type FailureCategory =
  | "spec_misalignment"
  | "scope_overreach"
  | "threshold_too_strict"
  | "regression"
  | "rule_conformance_violation"
  | "unknown";

/**
 * Runtime-readable list of all valid FailureCategory values. Useful for
 * regex-based parsers (analyzer-output-injector) that need to validate
 * a free-text classification before tagging an envelope.
 */
export const FAILURE_CATEGORIES: readonly FailureCategory[] = [
  "spec_misalignment",
  "scope_overreach",
  "threshold_too_strict",
  "regression",
  "rule_conformance_violation",
  "unknown",
] as const;

/**
 * Type guard — returns true if `s` is a valid FailureCategory string.
 * Use to coerce user-supplied or regex-extracted strings.
 */
export function isFailureCategory(s: string): s is FailureCategory {
  return (FAILURE_CATEGORIES as readonly string[]).includes(s);
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "6-member failure-category enum for analyzer hypothesis tagging; BackProp substrate, not Foundry surface",
};
export { categoryFoundryEquivalent as failureCategoryFoundryEquivalent };
