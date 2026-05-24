/**
 * palantir-mini schema primitive — FDEOntologyBuildSession + FDEGapReport.
 *
 * Read-only composed projection for FDE-style ontology build review. Captures
 * the 9 review levels (mission → object → link → action → function → chatbot
 * → MCP-boundary → branch-release → eval-observability) per the FDE Ontology
 * Build gap-analysis brief 2026-05-14.
 *
 * HARD READ-ONLY INVARIANT: this primitive NEVER authorizes mutation. The
 * mutationAuthorized field is a literal `false` type and recommendationOnly is
 * a literal `true` type. Downstream consumers must rely on these to refuse
 * dispatching commit/apply/approve based solely on this projection. Mutation
 * authority remains with SemanticIntentContract + DigitalTwinChangeContract
 * (lib/lead-intent/contracts.ts) + the sprint + governance pipeline.
 *
 * Source-of-truth references for the 9 levels:
 *   /home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md
 *   /home/palantirkc/.claude/plans/splendid-mapping-lemur.md (user-approved plan)
 *
 * Slice 1 of sprint-138 FDE introduction. Schema-only; lib/fde-build/ composer
 * arrives in the same PR; skill-only preview in the same PR; no public MCP, no
 * hook changes, no commit-path enforcement.
 *
 * @owner palantirkc-ontology
 * @purpose Read-only FDE ontology-build composed projection (9 review levels)
 *           + gap report recommendation. Never authorizes mutation.
 */

// =============================================================================
// Schema version constants
// =============================================================================

export const FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION =
  "palantir-mini/fde-ontology-build-session/v1" as const;

export const FDE_GAP_REPORT_SCHEMA_VERSION =
  "palantir-mini/fde-gap-report/v1" as const;

// =============================================================================
// Enums (string unions)
// =============================================================================

/**
 * The 9 FDE review levels. Each level matches a §7.x section of the gap-
 * analysis brief and contributes to the read-only readiness ladder.
 */
export type FDEReviewLevel =
  | "mission-decision"
  | "object-type"
  | "link-type"
  | "action-writeback"
  | "function"
  | "chatbot-studio"
  | "ai-fde-mcp-boundary"
  | "branch-release"
  | "eval-observability";

/**
 * Read-only readiness ladder. The verdict ascends as evidence accumulates
 * across the 9 review levels; "ready-for-semantic-approval" is the top of the
 * read-only ladder. CROSSING into mutation territory requires a paired
 * SemanticIntentContract + DigitalTwinChangeContract — never this projection.
 */
export type FDEReadinessVerdict =
  | "not-ready"
  | "mission-clear"
  | "object-link-clear"
  | "action-clear"
  | "chatbot-clear"
  | "eval-clear"
  | "ready-for-semantic-approval";

// =============================================================================
// Gap entry shape (shared across review levels)
// =============================================================================

/**
 * A single gap discovered while composing a review level. The composer + skill
 * surface this for human review; never auto-resolves.
 */
export interface FDEReviewLevelGap {
  readonly gapId: string;
  readonly level: FDEReviewLevel;
  readonly severity: "low" | "medium" | "high" | "blocking";
  readonly description: string;
  readonly recommendedAction?: string;
  readonly nextQuestion?: string;
}

// =============================================================================
// Level 1 — Mission Decision (brief §7.1)
// =============================================================================

/**
 * Level 1: the operational decision the chatbot/agent surface exists to
 * support. Anchors the rest of the review — without a named decision, object
 * types and actions cannot be evaluated for fitness.
 */
export interface FDEMissionDecision {
  readonly useCaseName?: string;
  readonly operationalDecision?: string;
  readonly decisionOwnerRole?: string;
  readonly decisionFrequency?: string;
  readonly currentDecisionPath?: string;
  readonly targetDecisionPath?: string;
  readonly evidenceObjectsRequired?: readonly string[];
  readonly actionRequiredAfterDecision?: string;
  readonly successMetrics?: readonly string[];
  readonly unresolvedGaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 2 — Object Type Review (brief §7.2)
// =============================================================================

/**
 * Level 2 array element: one ObjectType under review. The composer iterates
 * over the project's ObjectTypeRegistry and produces one entry per type.
 */
export interface FDEObjectTypeReview {
  readonly objectTypeName: string;
  readonly isRealWorldEntityOrEvent?: "entity" | "event";
  readonly primaryKeyStrategy?: string;
  readonly humanMeaningfulTitleProperty?: string;
  readonly requiredProperties?: readonly string[];
  readonly optionalProperties?: readonly string[];
  readonly sourceDatasets?: readonly string[];
  readonly writebackStatus?: "none" | "draft" | "approved";
  readonly objectViewStatus?: "absent" | "draft" | "ready";
  readonly consumingAppsOrChatbots?: readonly string[];
  readonly riskLevel?: "low" | "medium" | "high";
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 3 — Link Type Review (brief §7.3)
// =============================================================================

/**
 * Level 3 array element: one LinkType under review. Captures cardinality,
 * traversal semantics, and chatbot exposure policy.
 */
export interface FDELinkTypeReview {
  readonly linkTypeName: string;
  readonly sourceObjectType?: string;
  readonly targetObjectType?: string;
  readonly businessMeaning?: string;
  readonly cardinality?: "1-to-1" | "1-to-many" | "many-to-many";
  readonly backingDatasource?: string;
  readonly traversalUseCases?: readonly string[];
  readonly chatbotExposurePolicy?: "exposed" | "hidden" | "scoped";
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 4 — Action / Writeback Review (brief §7.4)
// =============================================================================

/**
 * Level 4 array element: one ActionType under review. Captures CRUD scope,
 * submission criteria, side effects, and chatbot confirmation policy.
 *
 * `submissionCriteriaNeedsHumanReview` carries deferred-to-v1 criteria that
 * the composer cannot evaluate automatically (e.g. ObjectQueryResult +
 * GroupMember per lib/actions/submission-criteria.ts:103-109). These bubble
 * into FDEGapReport.submissionCriteriaNeedsHumanReview.
 */
export interface FDEActionWritebackReview {
  readonly actionTypeName: string;
  readonly operationalIntent?: string;
  readonly createdObjects?: readonly string[];
  readonly modifiedObjects?: readonly string[];
  readonly deletedObjects?: readonly string[];
  readonly modifiedLinks?: readonly string[];
  readonly requiredParameters?: readonly string[];
  readonly sideEffects?: readonly string[];
  readonly submissionCriteria?: readonly string[];
  readonly chatbotConfirmationPolicy?: "always" | "high-impact-only" | "never";
  readonly writebackDataset?: string;
  readonly auditEvidence?: readonly string[];
  readonly submissionCriteriaNeedsHumanReview?: readonly string[];
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 5 — Function Review (brief §7.5)
// =============================================================================

/**
 * Level 5 array element: one AIPLogicFunction / typescript-function / sql-
 * derived-property / external-tool under review. Captures input/output
 * contract, determinism, evals, and version policy.
 */
export interface FDEFunctionReview {
  readonly functionName: string;
  readonly functionType?: string;
  readonly ontologyResourcesUsed?: readonly string[];
  readonly inputContract?: string;
  readonly outputContract?: string;
  readonly deterministic?: boolean;
  readonly chatbotToolUsage?: readonly string[];
  readonly actionUsage?: readonly string[];
  readonly evalSuite?: string;
  readonly versionPolicy?: string;
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 6 — Chatbot Studio Review (brief §7.6)
// =============================================================================

/**
 * Level 6 array element: one Chatbot Studio surface under review. Captures
 * the full operating envelope — ontology scope, retrieval/document context,
 * tool set, citation/confirmation policy, eval suite, session-trace
 * availability, and legacy-naming drift findings.
 */
export interface FDEChatbotStudioReview {
  readonly chatbotName: string;
  readonly legacyNamingFindings?: readonly string[];
  readonly ontologyScope?: readonly string[];
  readonly actionScope?: readonly string[];
  readonly functionScope?: readonly string[];
  readonly retrievalContext?: readonly string[];
  readonly documentContext?: readonly string[];
  readonly functionBackedContext?: readonly string[];
  readonly toolSet?: readonly string[];
  readonly applicationStateVariables?: readonly string[];
  readonly citationPolicy?: "required" | "optional" | "none";
  readonly confirmationPolicy?: "always" | "high-impact-only" | "never";
  readonly evalSuite?: string;
  readonly sessionTraceAvailable?: boolean;
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 7 — AI FDE / MCP Boundary Review (brief §7.7)
// =============================================================================

/**
 * Level 7: scope-of-edit boundary between builder-side structure changes and
 * consumer-side data-access changes. Mirrors the Palantir vs Ontology MCP +
 * local palantir-mini-as-analogue distinction.
 */
export interface FDEAIFDEMcpBoundaryReview {
  readonly taskKind?:
    | "builder-side-structure"
    | "consumer-side-data-access"
    | "mixed";
  readonly palantirMcpInScope?: boolean;
  readonly ontologyMcpInScope?: boolean;
  readonly localPluginAnalogueInScope?: boolean;
  readonly mutatingToolsRequireApproval?: boolean;
  readonly branchProposalPolicy?: string;
  readonly auditPolicy?: string;
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 8 — Branch + Release Review (brief §7.8)
// =============================================================================

/**
 * Level 8: branch + reviewer + rollback posture for the ontology change.
 * Mirrors Palantir Global Branching + Ontology Proposal review semantics.
 */
export interface FDEBranchReleaseReview {
  readonly branchName?: string;
  readonly branchRequirement?: string;
  readonly resourcesChanged?: readonly string[];
  readonly actionsTestedOnBranch?: readonly string[];
  readonly reviewersRequired?: readonly string[];
  readonly approvalStatus?: "pending" | "approved" | "rejected";
  readonly mergeConflictRisks?: readonly string[];
  readonly rollbackPlan?: string;
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// Level 9 — Eval + Observability Review (brief §7.9)
// =============================================================================

/**
 * Level 9: AIP Evals + Workflow Lineage / session-trace posture. Without
 * named eval suites + variance checks + regression baseline, nondeterministic
 * agent surfaces remain unmeasurable.
 */
export interface FDEEvalObservabilityReview {
  readonly evalSuiteName?: string;
  readonly targetFunctions?: readonly string[];
  readonly chatbotTargets?: readonly string[];
  readonly ontologyEditSimulationRequired?: boolean;
  readonly manualTestCases?: readonly string[];
  readonly generatedTestCases?: readonly string[];
  readonly evaluators?: readonly string[];
  readonly passCriteria?: string;
  readonly latestPassRate?: number;
  readonly varianceChecks?: readonly string[];
  readonly regressionBaseline?: string;
  readonly auditSessionTraceEvidence?: readonly string[];
  readonly gaps?: readonly FDEReviewLevelGap[];
}

// =============================================================================
// FDEOntologyBuildSession — main composed projection
// =============================================================================

/**
 * The composed read-only projection. Aggregates per-level data, the readiness
 * verdict, top-priority gaps, and the next question for the workbench to pose.
 *
 * HARD READ-ONLY INVARIANT: `mutationAuthorized` is a literal `false` type.
 * Downstream consumers MUST refuse to dispatch any commit/apply/approve based
 * solely on this projection. Mutation authority requires the
 * SemanticIntentContract + DigitalTwinChangeContract path.
 */
export interface FDEOntologyBuildSession {
  readonly schemaVersion: typeof FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION;
  /** Stable session identifier (RID-like). */
  readonly sessionRid: string;
  /** Project this session pertains to. */
  readonly project: string;
  /** ISO8601 timestamp when the session was composed. */
  readonly composedAt: string;
  /** READ-ONLY INVARIANT: this projection never authorizes mutation.
   *  Always `false`. Downstream consumers can rely on this to refuse to dispatch
   *  any commit/apply/approve from this projection. */
  readonly mutationAuthorized: false;
  /** True when the session is read-only design (no SIC/DTC approval yet). */
  readonly readOnly: boolean;
  /** Current readiness verdict (read-only ladder). */
  readonly readiness: FDEReadinessVerdict;
  /** Whether a DigitalTwinChangeContract is required before mutation may proceed.
   *  Always derives from `readiness === "ready-for-semantic-approval"` AND
   *  a corresponding approved SIC ref. */
  readonly requiresDigitalTwinChangeContract: boolean;
  /** SIC ref if one is already approved upstream. */
  readonly semanticIntentContractRef?: string;
  /** DTC ref if one is already approved upstream. */
  readonly digitalTwinChangeContractRef?: string;
  /** Plain-language status sentence for non-developers. */
  readonly plainLanguageStatus: string;
  /** Per-review-level data. */
  readonly missionDecision?: FDEMissionDecision;
  readonly objectTypes: readonly FDEObjectTypeReview[];
  readonly linkTypes: readonly FDELinkTypeReview[];
  readonly actionWriteback: readonly FDEActionWritebackReview[];
  readonly functions: readonly FDEFunctionReview[];
  readonly chatbotStudio: readonly FDEChatbotStudioReview[];
  readonly aiFdeMcpBoundary?: FDEAIFDEMcpBoundaryReview;
  readonly branchRelease?: FDEBranchReleaseReview;
  readonly evalObservability?: FDEEvalObservabilityReview;
  /** Levels the session has produced enough evidence to satisfy. */
  readonly completedLevels: readonly FDEReviewLevel[];
  /** Highest-priority gap shortlist (≤ 5). */
  readonly topGaps: readonly FDEReviewLevelGap[];
  /** All gaps surfaced (may be longer than topGaps). */
  readonly allGaps: readonly FDEReviewLevelGap[];
  /** When verdict is not ready, the next question the workbench should pose. */
  readonly nextQuestion?: string;
}

// =============================================================================
// FDEGapReport — recommendation-only summary (brief §10)
// =============================================================================

/**
 * Recommendation-only summary derived from a session. `recommendationOnly` is
 * a literal `true` type — this report never authorizes mutation. Reviewers
 * must still go through the SIC + DTC pipeline.
 *
 * `finalRecommendation` MUST NOT be "ready-for-implementation" or
 * "ready-for-evaluation" when topGaps contains "blocking" severity or when
 * submissionCriteriaNeedsHumanReview is non-empty. The composer enforces this
 * invariant; consumers may additionally re-check.
 */
export interface FDEGapReport {
  readonly schemaVersion: typeof FDE_GAP_REPORT_SCHEMA_VERSION;
  readonly reportRid: string;
  readonly sourceSessionRid: string;
  readonly project: string;
  readonly generatedAt: string;
  /** READ-ONLY INVARIANT: this report only recommends, never authorizes.
   *  Always `true`. */
  readonly recommendationOnly: true;
  /** Executive summary (plain language for non-developers). */
  readonly executiveSummary: string;
  /** Final recommendation; never "ready-for-production" when topGaps.severity includes "blocking"
   *  or submissionCriteriaNeedsHumanReview is non-empty. */
  readonly finalRecommendation:
    | "hold-design"
    | "ready-for-semantic-approval"
    | "ready-for-implementation"
    | "ready-for-evaluation";
  /** Submission criteria that need human review due to deferred-to-v1 behavior
   *  (e.g. ObjectQueryResult, GroupMember criteria — see
   *  lib/actions/submission-criteria.ts:103-109). */
  readonly submissionCriteriaNeedsHumanReview: readonly string[];
  /** Prioritized backlog of remaining work to reach finalRecommendation. */
  readonly prioritizedBacklog: readonly {
    readonly id: string;
    readonly title: string;
    readonly severity: FDEReviewLevelGap["severity"];
    readonly level: FDEReviewLevel;
  }[];
  /** Risk register (cross-cutting). */
  readonly riskRegister: readonly {
    readonly riskId: string;
    readonly title: string;
    readonly mitigation?: string;
  }[];
}
