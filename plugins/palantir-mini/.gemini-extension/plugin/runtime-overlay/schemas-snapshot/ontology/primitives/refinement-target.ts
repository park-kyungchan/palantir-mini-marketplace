/**
 * @stable — RefinementTarget interface primitive (prim-learn-18, v1.35.0)
 *
 * Typed reference to *what* aspect of the ontology / harness / rule a
 * refinement event proposes to change. Replaces free-form `withWhat.reasoning`
 * text with a structured pointer so harness-analyzer + dh-refinement-proposed
 * events can be grouped + dispatched without parsing prose.
 *
 * Mandatory on `validation_phase_completed.passed=false` per rule 26 §R5.
 *
 * Authority chain:
 *   research/palantir-vision/aipcon-devcon/ai-fde.md §FDE-08 (feedback →
 *     refined logic) + research/palantir-vision/philosophy/tribal-knowledge.md
 *     §PHIL.TK-12 (LEARN-02 eval feedback)
 *     ↓
 *   plans/nifty-mixing-diffie.md §Axis C2 (refinement target typed)
 *     ↓
 *   schemas/ontology/primitives/refinement-target.ts (this file)
 *     ↓
 *   palantir-mini/bridge/handlers/emit-event.ts (R5 enforcement)
 *     + agents/harness-analyzer.md (analysis-NNN.md author)
 *
 * D/L/A domain: LEARN (refinement target is a LEARN refinement input).
 * Rule cross-refs: rule 26 §R5, rule 16 v4.1.0 §Loop step 6.
 *
 * @owner palantirkc-ontology
 * @purpose Typed pointer to the refinement target (DH/HC/rubric/etc.)
 */

/**
 * Seven canonical kinds of refinement target. New kinds require a MINOR
 * schema bump (additive enum extension is non-breaking when readers fall
 * back to "other").
 *
 * - `primitive-field-add`         — add a new field to an existing primitive
 * - `primitive-field-extend-enum` — extend an enum union member set
 * - `event-type-add`              — register a new EventTypeName variant
 * - `grading-criterion-threshold` — adjust passFailLogic.threshold
 * - `failure-category-add`        — add a FailureCategory member
 * - `rule-conformance-policy`     — adjust LineageConformancePolicy
 * - `other`                       — fallback for unenumerated targets
 */
export type RefinementTargetKind =
  | "primitive-field-add"
  | "primitive-field-extend-enum"
  | "event-type-add"
  | "grading-criterion-threshold"
  | "failure-category-add"
  | "rule-conformance-policy"
  | "other";

/**
 * Runtime-readable list of all valid kinds.
 */
export const REFINEMENT_TARGET_KINDS: readonly RefinementTargetKind[] = [
  "primitive-field-add",
  "primitive-field-extend-enum",
  "event-type-add",
  "grading-criterion-threshold",
  "failure-category-add",
  "rule-conformance-policy",
  "other",
] as const;

export function isRefinementTargetKind(s: string): s is RefinementTargetKind {
  return (REFINEMENT_TARGET_KINDS as readonly string[]).includes(s);
}

/**
 * Confidence the analyzer/emitter has that this refinement is the correct
 * patch. Used by Lead to triage which proposals to act on first.
 */
export type RefinementConfidence = "high" | "medium" | "low";

export const REFINEMENT_CONFIDENCE_LEVELS: readonly RefinementConfidence[] = [
  "high",
  "medium",
  "low",
] as const;

export function isRefinementConfidence(s: string): s is RefinementConfidence {
  return (REFINEMENT_CONFIDENCE_LEVELS as readonly string[]).includes(s);
}

/**
 * Structured pointer to a refinement target. Required on
 * validation_phase_completed.passed=false events (rule 26 §R5).
 */
export interface RefinementTarget {
  readonly kind: RefinementTargetKind;
  /**
   * Either a primitive RID (e.g. "prim-data-08"), an absolute file path
   * (e.g. "/home/palantirkc/.claude/schemas/ontology/primitives/grading-criterion.ts"),
   * a hook name (e.g. "events-5d-gate"), or a rule citation (e.g. "rule 16 §Loop").
   */
  readonly filePathOrRid: string;
  /** User-facing one-sentence summary of the proposed change. */
  readonly description: string;
  readonly confidenceLevel: RefinementConfidence;
}

/**
 * Type guard — verifies structural shape. Use at hook + handler validation
 * boundaries before persisting to events.jsonl.
 */
export function isRefinementTarget(x: unknown): x is RefinementTarget {
  if (typeof x !== "object" || x === null) return false;
  const r = x as RefinementTarget;
  return (
    typeof r.kind === "string" &&
    isRefinementTargetKind(r.kind) &&
    typeof r.filePathOrRid === "string" &&
    r.filePathOrRid.length > 0 &&
    typeof r.description === "string" &&
    r.description.length > 0 &&
    typeof r.confidenceLevel === "string" &&
    isRefinementConfidence(r.confidenceLevel)
  );
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Typed refinement-target pointer (DH/HC/rubric/spec/skill/agent/hook); palantir-mini BackProp input, not Foundry surface",
};
export { categoryFoundryEquivalent as refinementTargetFoundryEquivalent };
