/**
 * palantir-mini bridge/handlers/grade-fde-readiness.ts
 *
 * Internal handler for FDE Ontology Build Readiness grading.
 *
 * CRITICAL INVARIANT: This handler is NOT registered in bridge/mcp-server.ts
 * TOOLS array. It is invoked only via skill (pm-fde-grade). No public MCP
 * exposure means no external agent or harness can trigger this directly.
 *
 * HARD READ-ONLY INVARIANT: The output FDEGapReportDetailed carries
 * `recommendationOnly: true` (literal type). This handler never produces
 * commitToken, applyToken, approvalToken, or authorizeMutation. Mutation
 * authority remains with SemanticIntentContract + DigitalTwinChangeContract.
 *
 * Per brief §10 + splendid-mapping-lemur.md Slice 3.B.
 *
 * @owner palantirkc-hook-builder (bridge/handlers/ per rule 07)
 * @sprint sprint-138 Slice 3.B
 */

import { gradeFDEReadiness } from "../../lib/fde-build/rubric-grader";
import { buildFDEGapReportDetailed } from "../../lib/fde-build/gap-report-builder";
import { detectSubmissionCriteriaNeedsHumanReview } from "../../lib/fde-build/submission-criteria-readiness";
import type { FDEGapReportDetailed } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-gap-report";
import type { FDEOntologyBuildSession } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";

// =============================================================================
// Public interface
// =============================================================================

export interface GradeFDEReadinessHandlerInput {
  readonly session: FDEOntologyBuildSession;
  /** Submission criteria currently in use across all actions in the session.
   *  Each entry carries { name, type } matching lib/actions/submission-criteria.ts.
   *  If absent, deferred-type detection is skipped (no false-negatives: an
   *  absent list means the caller asserts no submission criteria in use). */
  readonly criteriaInUse?: readonly { name: string; type: string }[];
  readonly nowIso?: string;
  readonly preferredLanguage?: "ko" | "en";
}

// =============================================================================
// Internal handler — NOT in MCP TOOLS array
// =============================================================================

/**
 * Grade an FDEOntologyBuildSession and return an FDEGapReportDetailed.
 *
 * Flow:
 *   1. Detect submission criteria needing human review (ObjectQueryResult +
 *      GroupMember deferred types via detectSubmissionCriteriaNeedsHumanReview).
 *   2. Run 17-criterion rubric grader (gradeFDEReadiness).
 *      - rule-domain → heuristic session field check.
 *      - model-domain → no modelGrader wired at handler level; defaults score=0.
 *        Callers requiring actual model evaluation should invoke
 *        grade_outcome_with_rubric MCP for those criteria separately and pass
 *        their results via a custom modelGrader callback to gradeFDEReadiness
 *        directly.
 *   3. Build detailed gap report (buildFDEGapReportDetailed).
 *
 * NEVER produces commitToken, applyToken, approvalToken, or authorizeMutation.
 * Callers MUST NOT dispatch any mutation based solely on the returned report.
 */
export async function handleGradeFDEReadiness(
  input: GradeFDEReadinessHandlerInput,
): Promise<FDEGapReportDetailed> {
  const { session, criteriaInUse, nowIso, preferredLanguage } = input;

  // Step 1: detect deferred submission criteria needing human review.
  const submissionCriteriaNeedsHumanReview =
    criteriaInUse != null
      ? detectSubmissionCriteriaNeedsHumanReview({ criteriaInUse })
      : [];

  // Step 2: run the 17-criterion rubric grader.
  // No modelGrader is wired at this level — model-domain criteria default
  // to score=0 (conservative; caller must wire model grading separately).
  const gradeResult = await gradeFDEReadiness({ session, nowIso });

  // Step 3: build and return the detailed gap report.
  return buildFDEGapReportDetailed({
    session,
    scorecard: gradeResult.perCriterion,
    overallScore: gradeResult.overallScore,
    overallThreshold: gradeResult.overallThreshold,
    overallPassed: gradeResult.overallPassed,
    submissionCriteriaNeedsHumanReview,
    nowIso,
    preferredLanguage,
  });
}
