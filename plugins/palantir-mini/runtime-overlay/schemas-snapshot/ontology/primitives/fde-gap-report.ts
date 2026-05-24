/**
 * palantir-mini schema primitive — FDEGapReportDetailed (Slice 3.A extension).
 *
 * Extends the Slice 1 minimal `FDEGapReport` (`./fde-ontology-build-session`)
 * with the 17-criterion scorecard slices, prioritized backlog, risk register,
 * branch + release plan, and eval plan defined in the FDE gap-analysis brief
 * §10. The minimal report from Slice 1 stays available for trivial consumers;
 * this extended report is the canonical artifact produced by Slice 3.B/3.C
 * scorecard composer.
 *
 * HARD READ-ONLY INVARIANT: `recommendationOnly` is a literal `true` type. The
 * report NEVER authorizes mutation; reviewers must still go through the
 * SemanticIntentContract + DigitalTwinChangeContract pipeline.
 *
 * INVARIANT (composer-enforced):
 *   - `finalRecommendation === "ready-for-implementation"` IS DISALLOWED when
 *     `submissionCriteriaNeedsHumanReview.length > 0` (deferred-pass behavior
 *     for ObjectQueryResult + GroupMember per
 *     lib/actions/submission-criteria.ts:103-109).
 *   - `finalRecommendation === "ready-for-implementation"` IS DISALLOWED when
 *     any `FDECriterionScore.passed === false` AND its
 *     `weightedContribution > 0`.
 *
 * Authority:
 *   /home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §10
 *   /home/palantirkc/.claude/plans/splendid-mapping-lemur.md Slice 3 (user-approved plan)
 *
 * @owner palantirkc-ontology
 * @purpose Recommendation-only 17-criterion FDE scorecard + backlog + risk register
 */

import type {
  FDEOntologyBuildSession,
  FDEReviewLevel,
  FDEReviewLevelGap,
} from "./fde-ontology-build-session";

// =============================================================================
// Schema version constant
// =============================================================================

export const FDE_GAP_REPORT_DETAILED_SCHEMA_VERSION =
  "palantir-mini/fde-gap-report-detailed/v1" as const;

// =============================================================================
// FDECriterionScore — per-criterion slice of the 17-criterion scorecard
// =============================================================================

/**
 * One row of the scorecard. The composer fills this per criterion declared in
 * `FDE_GRADING_RUBRIC` (`./fde-grading-rubric`). `weightedContribution =
 * normalizedScore * weightInRubric` where `normalizedScore = score / scaleMax`
 * (scaleMax = 10 for model-domain, 1 for rule-domain).
 *
 * `passed === score >= threshold` for the criterion's scale.
 */
export interface FDECriterionScore {
  readonly criterionId: string;
  readonly title: string;
  /** Raw score: 0-10 for model-domain, 0/1 for rule-domain. */
  readonly score: number;
  /** Threshold the score must reach (>=) to pass this criterion. */
  readonly threshold: number;
  /** Convenience: `score >= threshold`. */
  readonly passed: boolean;
  /** Weight assigned to this criterion in the rubric (sum across rubric = 1.0). */
  readonly weightInRubric: number;
  /** `normalizedScore * weightInRubric` (rounded to 4 places by composer). */
  readonly weightedContribution: number;
  /** Optional supporting evidence — file paths, lineage RIDs, event IDs. */
  readonly evidence?: readonly string[];
  /** Optional reasoning trace from the grader (model-domain) or rule path. */
  readonly reasoning?: string;
}

// =============================================================================
// FDEGapReportDetailed — main composed projection
// =============================================================================

/**
 * Extended recommendation-only summary derived from an `FDEOntologyBuildSession`.
 *
 * Composition rule:
 *   `ontologyScorecard` + `chatbotScorecard` + `aiFdeMcpScorecard` +
 *   `governanceEvalScorecard` together MUST cover all 17 criteria declared in
 *   `FDE_GRADING_RUBRIC`. Composer routes:
 *     ontology         → criteria 1-6 (mission/object/link/action/submission/function)
 *     chatbot          → criteria 7-10 (chatbot studio + app-state + retrieval + citation)
 *     aiFdeMcp         → criteria 11-13 (branching + boundary + OSDK scoping)
 *     governanceEval   → criteria 14-17 (eval coverage + audit + release + post-rename)
 *
 * `overallScore = Σ weightedContribution`. `overallPassed = overallScore >=
 * overallThreshold` (composer reads `FDE_GRADING_RUBRIC.aggregator.threshold`).
 *
 * `finalRecommendation` invariants (composer-enforced):
 *   - When any `topGap.severity === "blocking"` → never higher than
 *     "ready-for-semantic-approval".
 *   - When `submissionCriteriaNeedsHumanReview.length > 0` → never
 *     "ready-for-implementation".
 *   - When `overallPassed === false` → never higher than "hold-design".
 *
 * HARD READ-ONLY INVARIANT: `recommendationOnly` is a literal `true` type.
 * Consumers MUST refuse to dispatch any commit/apply/approve based solely on
 * this report. Mutation requires the SIC + DTC pipeline.
 */
export interface FDEGapReportDetailed {
  readonly schemaVersion: typeof FDE_GAP_REPORT_DETAILED_SCHEMA_VERSION;
  readonly reportRid: string;
  readonly sourceSessionRid: string;
  readonly project: string;
  readonly generatedAt: string;
  /** READ-ONLY INVARIANT: this report only recommends, never authorizes.
   *  Always `true`. */
  readonly recommendationOnly: true;
  readonly executiveSummary: string;
  /** Findings surfaced during post-rename audit (legacy naming drift, etc.).
   *  Bubbles up from `FDEChatbotStudioReview.legacyNamingFindings`. */
  readonly postRenameAuditFindings: readonly string[];
  // --- 4 scorecard slices covering 17 criteria ---
  readonly ontologyScorecard: readonly FDECriterionScore[];
  readonly chatbotScorecard: readonly FDECriterionScore[];
  readonly aiFdeMcpScorecard: readonly FDECriterionScore[];
  readonly governanceEvalScorecard: readonly FDECriterionScore[];
  // --- Aggregate ---
  /** `Σ weightedContribution` across all 4 scorecards (0.0-1.0). */
  readonly overallScore: number;
  /** Reads `FDE_GRADING_RUBRIC.aggregator.threshold` (currently 0.70). */
  readonly overallThreshold: number;
  /** `overallScore >= overallThreshold`. */
  readonly overallPassed: boolean;
  /**
   * Final recommendation. NEVER "ready-for-implementation" when
   * `submissionCriteriaNeedsHumanReview` is non-empty (deferred submission
   * criteria) or when `overallPassed === false`. NEVER higher than
   * "ready-for-semantic-approval" when any blocking gap exists.
   */
  readonly finalRecommendation:
    | "hold-design"
    | "ready-for-semantic-approval"
    | "ready-for-implementation"
    | "ready-for-evaluation";
  /**
   * Submission-criteria that returned deferred-pass behavior (e.g.
   * ObjectQueryResult, GroupMember per
   * lib/actions/submission-criteria.ts:103-109). When non-empty,
   * `finalRecommendation` MUST NOT be "ready-for-implementation".
   * Bubbles up from `FDEActionWritebackReview.submissionCriteriaNeedsHumanReview`.
   */
  readonly submissionCriteriaNeedsHumanReview: readonly string[];
  /**
   * Prioritized backlog of remaining work to reach `finalRecommendation`.
   * Each entry traces to one or more rubric criteria so reviewers can see
   * which 17-criterion axes the work would lift.
   */
  readonly prioritizedBacklog: readonly {
    readonly id: string;
    readonly title: string;
    readonly severity: FDEReviewLevelGap["severity"];
    readonly level: FDEReviewLevel;
    /** Criterion RIDs (from `FDE_GRADING_RUBRIC.criterionRids`) this item lifts. */
    readonly relatedCriterionIds?: readonly string[];
  }[];
  /** Risk register (cross-cutting; not bound to a single review level). */
  readonly riskRegister: readonly {
    readonly riskId: string;
    readonly title: string;
    readonly mitigation?: string;
    /** Criterion RIDs this risk threatens. */
    readonly relatedCriterionIds?: readonly string[];
  }[];
  /**
   * Optional branch + release plan when the session already declared one via
   * `FDEBranchReleaseReview`. Surfaces the readiness facts so reviewers do not
   * need to re-traverse the session.
   */
  readonly branchReleasePlan?: {
    readonly branchName?: string;
    readonly resourcesChanged: readonly string[];
    readonly rollbackPlan?: string;
  };
  /**
   * Optional eval plan when the session already declared one via
   * `FDEEvalObservabilityReview`. Captures the suite RID + variance checks
   * paired against the readiness scorecard.
   */
  readonly evalPlan?: {
    readonly evalSuiteRid?: string;
    readonly varianceChecks: readonly string[];
  };
}

// =============================================================================
// Type re-export for composer convenience
// =============================================================================

export type { FDEOntologyBuildSession };

// =============================================================================
// Foundry equivalence (R5-F14 / S3)
// =============================================================================

import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "FDE detailed gap report combines AIP Evals scorecard semantics with " +
    "palantir-mini-local 9-level review structure + deferred-submission-criteria " +
    "invariant; no direct Foundry counterpart.",
};
export { categoryFoundryEquivalent as fdeGapReportFoundryEquivalent };
