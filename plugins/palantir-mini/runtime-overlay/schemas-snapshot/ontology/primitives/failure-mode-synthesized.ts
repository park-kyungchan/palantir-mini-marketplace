/**
 * @stable — FailureModeSynthesized event payload primitive (prim-data-15, v1.32.0)
 *
 * Structured root-cause hypothesis emitted by the `analyzer-output-injector`
 * PostToolUse hook when an iteration's `analysis-NNN.md` is parsed. Carries
 * a typed `FailureCategory` tag so downstream queries (sprint-008+
 * `pm_cross_sprint_pattern_query`) can detect repeated failure patterns
 * across sprints without re-parsing free-text rationale.
 *
 * Lineage relationship:
 *   - One `sprint_completed` event per contract close.
 *   - Zero or more `failure_mode_synthesized` events per sprint — one per
 *     iteration whose analysis-NNN.md contains a `§Failure category` section.
 *   - `learning_captured` envelopes (topic-prefixed `sprint-NNN-`) are
 *     emitted alongside as freer-form BackProp signals.
 *
 * Authority chain:
 *   plans/tidy-stargazing-papert.md §Confirmed Decisions Q2*
 *     ↓
 *   schemas/ontology/primitives/failure-mode-synthesized.ts (this file)
 *     ↓
 *   palantir-mini/lib/event-log/types.ts FailureModeSynthesizedEnvelope (runtime)
 *     ↓
 *   palantir-mini/hooks/analyzer-output-injector.ts (emit site)
 *
 * D/L/A domain: DATA (event payload shape — append-only log record)
 * @owner palantirkc-ontology
 * @purpose Sprint-iteration root-cause classification event payload
 */

import type { FailureCategory } from "./failure-category";

/**
 * Payload for the failure_mode_synthesized event. Envelope wrapping is
 * provided by the palantir-mini plugin
 * (lib/event-log/types.ts FailureModeSynthesizedEnvelope) so consumers
 * outside the plugin import only the payload shape.
 */
export interface FailureModeSynthesizedPayload {
  readonly sprintNumber: number;
  readonly iteration: number;
  readonly failureCategory: FailureCategory;
  /** Free-text root-cause hypothesis extracted from analysis-NNN.md. */
  readonly rootCauseHypothesis: string;
  /**
   * Optional patch-type hint surfaced by the analyzer (e.g. "rubric_relax",
   * "spec_clarify", "scope_narrow"). Reserved for sprint-009 self-amending
   * rubric work; currently advisory.
   */
  readonly suggestedPatchType?: string;
  /** Optional minimal patch text suggested by the analyzer (advisory). */
  readonly smallestPatch?: string;
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Analyzer-synthesized failure-mode event payload; palantir-mini BackProp substrate, not Foundry surface",
};
export { categoryFoundryEquivalent as failureModeSynthesizedFoundryEquivalent };
