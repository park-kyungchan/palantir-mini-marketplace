/**
 * palantir-mini lib/fde-build/gap-report-builder.ts
 *
 * Composes an FDEGapReportDetailed from a session + scorecard.
 *
 * HARD READ-ONLY INVARIANT: the produced report carries `recommendationOnly:
 * true` (literal type). It NEVER contains commitToken, applyToken,
 * approvalToken, or authorizeMutation. The finalRecommendation field obeys
 * the HARD ladder:
 *   1. submissionCriteriaNeedsHumanReview.length > 0 → MAX "ready-for-semantic-approval"
 *   2. any criterion failed AND weightedContribution > 0 → MAX "ready-for-semantic-approval"
 *   3. any topGap.severity === "blocking" → MAX "ready-for-semantic-approval"
 *   4. !overallPassed → "hold-design"
 *   5. else → "ready-for-implementation" or "ready-for-evaluation"
 *
 * 4-scorecard partitioning (criteria 1-17 per FDE_GRADING_RUBRIC):
 *   ontologyScorecard       → criteria 1-6  (mission / object / link / action / submission / function)
 *   chatbotScorecard        → criteria 7-10 (chatbot studio / app-state / retrieval / citation)
 *   aiFdeMcpScorecard       → criteria 11-13 (branching / boundary / OSDK)
 *   governanceEvalScorecard → criteria 14-17 (eval / audit / release / post-rename)
 *
 * Per brief §10 + splendid-mapping-lemur.md Slice 3.B.
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 3.B
 */

import type {
  FDEOntologyBuildSession,
  FDEReviewLevelGap,
  FDEReviewLevel,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import type {
  FDEGapReportDetailed,
  FDECriterionScore,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-gap-report";
import { FDE_GAP_REPORT_DETAILED_SCHEMA_VERSION } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-gap-report";
import { createHash } from "crypto";

// =============================================================================
// Public input interface
// =============================================================================

export interface BuildFDEGapReportInput {
  readonly session: FDEOntologyBuildSession;
  readonly scorecard: readonly FDECriterionScore[];
  readonly overallScore: number;
  readonly overallThreshold: number;
  readonly overallPassed: boolean;
  readonly submissionCriteriaNeedsHumanReview: readonly string[];
  readonly nowIso?: string;
  readonly preferredLanguage?: "ko" | "en";
}

// =============================================================================
// Criterion → scorecard partition mapping
// =============================================================================

/**
 * Maps a criterion id suffix to the scorecard partition it belongs to.
 * Criterion IDs are of the form "criterion:<suffix>" per gradingCriterionRid().
 */
const CRITERION_PARTITION: Record<
  string,
  "ontology" | "chatbot" | "aiFdeMcp" | "governanceEval"
> = {
  // ontologyScorecard — criteria 1-6
  mission_decision_alignment: "ontology",
  object_type_quality: "ontology",
  link_type_quality: "ontology",
  action_type_and_writeback_quality: "ontology",
  submission_criteria_quality: "ontology",
  function_contract_quality: "ontology",
  // chatbotScorecard — criteria 7-10
  aip_chatbot_studio_configuration: "chatbot",
  application_state_determinism: "chatbot",
  retrieval_context_quality: "chatbot",
  citation_and_evidence_quality: "chatbot",
  // aiFdeMcpScorecard — criteria 11-13
  ai_fde_branching_and_tool_governance: "aiFdeMcp",
  palantir_mcp_omcp_boundary_control: "aiFdeMcp",
  osdk_resource_scoping: "aiFdeMcp",
  // governanceEvalScorecard — criteria 14-17
  eval_coverage: "governanceEval",
  auditability_and_observability: "governanceEval",
  release_and_change_management: "governanceEval",
  post_rename_naming_compliance: "governanceEval",
};

function partitionOf(
  criterionId: string,
): "ontology" | "chatbot" | "aiFdeMcp" | "governanceEval" {
  // criterionId format: "criterion:<suffix>"
  const suffix = criterionId.startsWith("criterion:")
    ? criterionId.slice("criterion:".length)
    : criterionId;
  return CRITERION_PARTITION[suffix] ?? "governanceEval";
}

// =============================================================================
// finalRecommendation decision ladder (HARD enforced)
// =============================================================================

type FinalRecommendation = FDEGapReportDetailed["finalRecommendation"];

function computeFinalRecommendation(
  scorecard: readonly FDECriterionScore[],
  overallPassed: boolean,
  submissionCriteriaNeedsHumanReview: readonly string[],
  hasBlockingGap: boolean,
): FinalRecommendation {
  // 1. Deferred submission criteria → cap at ready-for-semantic-approval
  if (submissionCriteriaNeedsHumanReview.length > 0) {
    return "ready-for-semantic-approval";
  }

  // 2. Any failed criterion with positive weight → cap at ready-for-semantic-approval
  const anyWeightedFail = scorecard.some(
    (c) => !c.passed && c.weightedContribution > 0,
  );
  if (anyWeightedFail) {
    return "ready-for-semantic-approval";
  }

  // 3. Blocking gap → cap at ready-for-semantic-approval
  if (hasBlockingGap) {
    return "ready-for-semantic-approval";
  }

  // 4. Overall not passed → hold-design
  if (!overallPassed) {
    return "hold-design";
  }

  // 5. All criteria pass + no blocking → ready for next phase
  // Use ready-for-evaluation when eval_coverage passes, else ready-for-implementation
  const evalCoveragePassed = scorecard.find(
    (c) =>
      c.criterionId === "criterion:eval_coverage" ||
      c.criterionId.endsWith(":eval_coverage"),
  )?.passed;

  return evalCoveragePassed
    ? "ready-for-evaluation"
    : "ready-for-implementation";
}

// =============================================================================
// Executive summary generator
// =============================================================================

function buildExecutiveSummary(
  overallScore: number,
  overallPassed: boolean,
  finalRecommendation: FinalRecommendation,
  failedCount: number,
  totalCount: number,
  lang: "ko" | "en",
): string {
  if (lang === "ko") {
    return (
      `FDE 준비도 평가 완료. 종합 점수: ${(overallScore * 100).toFixed(1)}% ` +
      `(기준: ${(0.7 * 100).toFixed(0)}%). ` +
      `${totalCount}개 기준 중 ${failedCount}개 미충족. ` +
      `최종 권고: ${finalRecommendation}. ` +
      `이 보고서는 권고 전용(recommendation-only)입니다 — mutation 권한 없음.`
    );
  }
  return (
    `FDE readiness evaluation complete. Overall score: ${(overallScore * 100).toFixed(1)}% ` +
    `(threshold: ${(0.7 * 100).toFixed(0)}%). ` +
    `${failedCount} of ${totalCount} criteria failed. ` +
    `Final recommendation: ${finalRecommendation}. ` +
    `This report is recommendation-only — no mutation authority.`
  );
}

// =============================================================================
// Prioritized backlog builder from session allGaps + failed criteria
// =============================================================================

function buildPrioritizedBacklog(
  allGaps: readonly FDEReviewLevelGap[],
  scorecard: readonly FDECriterionScore[],
): FDEGapReportDetailed["prioritizedBacklog"] {
  // Map severity to sort order.
  const severityOrder: Record<string, number> = {
    blocking: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const backlogFromGaps = allGaps.map((gap, idx) => ({
    id: `gap-${idx + 1}`,
    title: gap.description,
    severity: gap.severity,
    level: gap.level,
  }));

  // Add synthetic entries for failed-criteria with no corresponding gap.
  const failedCriteriaItems = scorecard
    .filter((c) => !c.passed)
    .map((c) => ({
      id: `criterion-fail-${c.criterionId}`,
      title: `Criterion not met: ${c.title}`,
      severity: "medium" as const,
      level: "mission-decision" as FDEReviewLevel,
      relatedCriterionIds: [c.criterionId] as readonly string[],
    }));

  return [...backlogFromGaps, ...failedCriteriaItems].sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );
}

// =============================================================================
// Main builder
// =============================================================================

/**
 * Build an FDEGapReportDetailed from grader output + session.
 *
 * Enforces all finalRecommendation invariants from the schema comment.
 * Result is recommendation-only — no mutation authority fields present.
 */
export function buildFDEGapReportDetailed(
  input: BuildFDEGapReportInput,
): FDEGapReportDetailed {
  const {
    session,
    scorecard,
    overallScore,
    overallThreshold,
    overallPassed,
    submissionCriteriaNeedsHumanReview,
    nowIso,
    preferredLanguage = "en",
  } = input;

  const generatedAt = nowIso ?? new Date().toISOString();

  // Partition scorecard into 4 slices.
  const ontologyScorecard = scorecard.filter(
    (c) => partitionOf(c.criterionId) === "ontology",
  );
  const chatbotScorecard = scorecard.filter(
    (c) => partitionOf(c.criterionId) === "chatbot",
  );
  const aiFdeMcpScorecard = scorecard.filter(
    (c) => partitionOf(c.criterionId) === "aiFdeMcp",
  );
  const governanceEvalScorecard = scorecard.filter(
    (c) => partitionOf(c.criterionId) === "governanceEval",
  );

  // Check for blocking gaps.
  const allGaps = session.allGaps ?? [];
  const hasBlockingGap = allGaps.some((g) => g.severity === "blocking");

  // Compute final recommendation (HARD ladder).
  const finalRecommendation = computeFinalRecommendation(
    scorecard,
    overallPassed,
    submissionCriteriaNeedsHumanReview,
    hasBlockingGap,
  );

  const failedCount = scorecard.filter((c) => !c.passed).length;

  const executiveSummary = buildExecutiveSummary(
    overallScore,
    overallPassed,
    finalRecommendation,
    failedCount,
    scorecard.length,
    preferredLanguage,
  );

  // Post-rename audit findings from chatbot reviews.
  const postRenameAuditFindings = (session.chatbotStudio ?? []).flatMap(
    (c) => c.legacyNamingFindings ?? [],
  );

  // Unique report RID.
  const reportRid = `report:fde-gap:${createHash("sha256")
    .update(`${session.sessionRid}:${generatedAt}`)
    .digest("hex")
    .slice(0, 12)}`;

  // Build prioritized backlog.
  const prioritizedBacklog = buildPrioritizedBacklog(allGaps, scorecard);

  // Risk register from allGaps (blocking/high severity → explicit risk entry).
  const riskRegister: FDEGapReportDetailed["riskRegister"] = allGaps
    .filter((g) => g.severity === "blocking" || g.severity === "high")
    .map((g, idx) => ({
      riskId: `risk-${idx + 1}`,
      title: g.description,
      mitigation: g.recommendedAction,
    }));

  // Branch + release plan (optional).
  const branchReleasePlan =
    session.branchRelease != null
      ? {
          branchName: session.branchRelease.branchName,
          resourcesChanged: session.branchRelease.resourcesChanged ?? [],
          rollbackPlan: session.branchRelease.rollbackPlan,
        }
      : undefined;

  // Eval plan (optional).
  const evalPlan =
    session.evalObservability != null
      ? {
          evalSuiteRid: session.evalObservability.evalSuiteName,
          varianceChecks: session.evalObservability.varianceChecks ?? [],
        }
      : undefined;

  return {
    schemaVersion: FDE_GAP_REPORT_DETAILED_SCHEMA_VERSION,
    reportRid,
    sourceSessionRid: session.sessionRid,
    project: session.project,
    generatedAt,
    // HARD READ-ONLY INVARIANT — literal true, never a variable.
    recommendationOnly: true,
    executiveSummary,
    postRenameAuditFindings,
    ontologyScorecard,
    chatbotScorecard,
    aiFdeMcpScorecard,
    governanceEvalScorecard,
    overallScore,
    overallThreshold,
    overallPassed,
    finalRecommendation,
    submissionCriteriaNeedsHumanReview,
    prioritizedBacklog,
    riskRegister,
    branchReleasePlan,
    evalPlan,
  };
}
