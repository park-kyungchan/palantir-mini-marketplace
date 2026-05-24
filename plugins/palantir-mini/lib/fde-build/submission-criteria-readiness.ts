/**
 * palantir-mini lib/fde-build/submission-criteria-readiness.ts
 *
 * Deferred-behavior detector for submission criteria (brief §13).
 *
 * Reads the deferred criterion types from lib/actions/submission-criteria.ts
 * at call-time (patterns at lines 103-109): ObjectQueryResult and GroupMember
 * both defer to v1 because no query runner / identity system is wired in v0.
 *
 * Returns the NAMES of criteria that should flag for needs-human-review
 * before any FDE writeback path proceeds to ready-for-implementation.
 *
 * HARD READ-ONLY INVARIANT: this module produces a list for human review,
 * NOT a mutation approval. It never emits commitToken, applyToken,
 * approvalToken, or authorizeMutation.
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 3.B
 */

// =============================================================================
// Deferred criterion types (hard-coded from submission-criteria.ts:103-109)
// =============================================================================

/**
 * Criterion types whose v0 evaluator is deferred (always passes with a
 * "deferred to v1" note in lib/actions/submission-criteria.ts).
 *
 * ObjectQueryResult (line 103-107): "query runner not yet wired"
 * GroupMember (line 108-111):       "no identity/group system in v0"
 *
 * Any criterion matching these types requires human review before the FDE
 * gap report can recommend "ready-for-implementation".
 */
const DEFERRED_CRITERION_TYPES = new Set<string>([
  "ObjectQueryResult",
  "GroupMember",
]);

// =============================================================================
// Public API
// =============================================================================

/**
 * Detect submission criteria that have deferred evaluation behavior and
 * therefore require explicit human review.
 *
 * Per brief §13: submission criteria with ObjectQueryResult or GroupMember
 * type are evaluated as "passed" in v0 with a deferral note — this is a
 * false-positive pass. The FDE gap report MUST flag these for human review
 * so the finalRecommendation never reaches "ready-for-implementation" without
 * explicit sign-off.
 *
 * @param input.criteriaInUse The criteria currently in use for the action
 *   type(s) being evaluated. Each entry carries { name, type } matching the
 *   SubmissionCriterion union in lib/actions/submission-criteria.ts.
 * @returns Array of criterion NAMES that need human review (NOT the types).
 *   An empty array means no deferred criteria are in use.
 */
export function detectSubmissionCriteriaNeedsHumanReview(input: {
  readonly criteriaInUse: readonly { name: string; type: string }[];
}): readonly string[] {
  return input.criteriaInUse
    .filter((c) => DEFERRED_CRITERION_TYPES.has(c.type))
    .map((c) => c.name);
}
