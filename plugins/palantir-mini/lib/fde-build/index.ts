/**
 * palantir-mini lib/fde-build/index.ts
 *
 * Barrel re-export for the fde-build module.
 *
 * Public API:
 *   - composeFDEOntologyBuildSession (main entry point)
 *   - evaluateReadiness (ladder evaluator)
 *   - 9 level builders (buildMissionDecision, etc.)
 *
 * Read-only invariant: nothing in this module produces commitToken,
 * applyToken, approvalToken, or authorizeMutation.
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 1.B
 */

export {
  composeFDEOntologyBuildSession,
  type ComposeFDEOntologyBuildSessionInput,
} from "./session-composer";

export {
  adaptFDEContextToLevelBuilderInput,
  type AdaptFDEContextInput,
} from "./context-adapter";

export { evaluateReadiness } from "./readiness-evaluator";
export type { ReadinessResult } from "./readiness-evaluator";

export {
  buildMissionDecision,
  buildObjectTypeReviews,
  buildLinkTypeReviews,
  buildActionWritebackReviews,
  buildFunctionReviews,
  buildChatbotStudioReviews,
  buildAIFDEMcpBoundaryReview,
  buildBranchReleaseReview,
  buildEvalObservabilityReview,
  type LevelBuilderInput,
} from "./level-builders";

// Slice 2.B — naming-audit exports
export {
  classifyTermHit,
  getBaselineTermSpecs,
  isCompatibilityIdentifier,
  resetFindingCounter,
} from "./naming-classifier";
export {
  runNamingAudit,
  NAMING_AUDIT_ALLOW_GLOBS,
  NAMING_AUDIT_DENY_GLOBS,
  type NamingAuditRunnerInput,
} from "./naming-audit-runner";
export { renderNamingAuditReportMarkdown } from "./naming-report-renderer";
export type { RenderOptions as NamingReportRenderOptions } from "./naming-report-renderer";

// Slice 3.B additions — rubric grader + gap report builder + submission criteria readiness
export {
  gradeFDEReadiness,
  type GradeFDEReadinessInput,
  type GradeFDEReadinessResult,
} from "./rubric-grader";

export {
  buildFDEGapReportDetailed,
  renderFDEGapReportMarkdown,
  type BuildFDEGapReportInput,
} from "./gap-report-builder";

export { detectSubmissionCriteriaNeedsHumanReview } from "./submission-criteria-readiness";
