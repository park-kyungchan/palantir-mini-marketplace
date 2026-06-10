export const FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION =
  "palantir-mini/fde-ontology-engineering-session/v1" as const;

export const FDE_ONTOLOGY_TURN_RECORD_SCHEMA_VERSION =
  "palantir-mini/fde-ontology-engineering-turn/v1" as const;

export type FDEOntologyEngineeringPhase =
  | "entry-intent"
  | "mission-decision"
  | "learner-or-user-context"
  | "evidence-definition"
  | "object-type-discovery"
  | "link-type-discovery"
  | "action-writeback-discovery"
  | "function-logic-discovery"
  | "chatbot-application-state"
  | "governance-eval"
  | "semantic-contract-ready"
  | "dtc-ready";

export type LatentIntentStatus =
  | "inferred"
  | "recommended"
  | "accepted"
  | "rejected"
  | "deferred";

export type LatentIntentFamily =
  | "framework-discovery"
  | "mission-decision"
  | "decision-owner"
  | "evidence-definition"
  | "scope-non-goal"
  | "output-audience"
  | "data-authority"
  | "logic-authority"
  | "action-writeback-risk"
  | "chatbot-application-state"
  | "technology-surface"
  | "eval-readiness"
  | "governance-boundary"
  | "math-thinking-evidence"
  | "instructional-explanation-quality"
  | "curriculum-reference-boundary"
  | "chatbot-studio-design"
  | "action-writeback-design"
  | "function-logic-design"
  | "governance-eval-design"
  | "runtime-hook-design"
  | "evidence-policy-design";

export interface LatentIntentHypothesis {
  readonly hypothesisId: string;
  readonly status: LatentIntentStatus;
  readonly ruleId?: string;
  readonly templateId?: string;
  /** Optional v2 family metadata. Legacy v1 snapshots omit this field. */
  readonly family?: LatentIntentFamily;
  readonly confidence?: number;
  readonly decisionAxis?: "data" | "logic" | "action" | "governance" | "application-state";
  readonly readinessRequirementIds?: readonly string[];
  readonly promotedFromHypothesisId?: string;
  readonly plainLanguage: string;
  readonly whyLeadInferredThis: string;
  readonly whatUserMayNotHaveNoticed: string;
  readonly recommendedDefault: string;
  readonly riskIfWrong: string;
  readonly whatWillNotHappenIfAccepted: readonly string[];
  readonly ontologyImplication: {
    readonly possibleObjects: readonly string[];
    readonly possibleLinks: readonly string[];
    readonly possibleActions: readonly string[];
    readonly possibleFunctions: readonly string[];
  };
  readonly evidenceNeeded: readonly string[];
  readonly sourceRefs: readonly string[];
}

export interface MissionDecisionModel {
  readonly useCaseName?: string;
  readonly operationalDecision?: string;
  readonly decisionOwnerRole?: string;
  readonly successSignals: readonly string[];
}

export interface EvidenceModel {
  readonly evidenceDefinition?: string;
  readonly observableSignals: readonly string[];
  readonly sourceArtifactRefs: readonly string[];
  readonly missingEvidenceQuestions: readonly string[];
}

export interface FDEOntologyStableSummary {
  readonly confirmedIntent?: string;
  readonly missionSummary?: string;
  readonly evidenceSummary?: string;
  readonly ontologySummary?: string;
  readonly governanceSummary?: string;
  readonly acceptedHypothesisCount: number;
  readonly rejectedHypothesisCount: number;
  readonly deferredHypothesisCount: number;
  readonly unresolvedBlockingQuestionCount: number;
  readonly sourceTurnIds: readonly string[];
  readonly updatedAt: string;
}

export interface FDEOntologyPhaseHistoryEntry {
  readonly phase: FDEOntologyEngineeringPhase;
  readonly enteredAt: string;
  readonly reason: string;
  readonly turnId?: string;
  readonly previousPhase?: FDEOntologyEngineeringPhase;
}

/**
 * Optional rid declared at the SOURCE (e.g. a frozen NC1 SOURCE row that already
 * carries the registered `pm.self.ontology/*` rid for a previously-promoted atom).
 * When present, the register seam prefers it over a freshly-minted
 * `projectPrimitiveRid(...)`, so an authored rid round-trips instead of being
 * re-minted. Optional + additive: absent on interactively-authored candidates and
 * on every existing session fixture (zero behavior change when omitted).
 */
export interface ObjectTypeCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  readonly whyItMayMatter: string;
  readonly evidenceRefs: readonly string[];
  readonly declaredRid?: string;
}

export interface LinkTypeCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  readonly sourceObject?: string;
  readonly targetObject?: string;
  readonly businessMeaning: string;
  readonly evidenceRefs: readonly string[];
  readonly declaredRid?: string;
}

export interface ActionTypeCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  readonly operationalIntent: string;
  readonly writebackRisk: "none" | "low" | "medium" | "high";
  readonly submissionCriteria?: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly declaredRid?: string;
}

export interface FunctionCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  readonly logicIntent: string;
  readonly deterministic?: boolean;
  readonly evidenceRefs: readonly string[];
  readonly declaredRid?: string;
}

export interface ChatbotContextCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  readonly applicationStateNeed: string;
  readonly retrievalContextNeed?: string;
  readonly evidenceRefs: readonly string[];
  readonly declaredRid?: string;
}

export interface RoleCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  readonly principalKind?: "agent" | "runtime" | "capability-token";
  readonly grantedResourceRefs?: readonly string[];
  readonly permissions?: readonly string[];
  readonly whyItMayMatter?: string;
  readonly evidenceRefs?: readonly string[];
}

export interface PropertyCandidate {
  readonly candidateId: string;
  readonly plainName: string;
  /** plainName of the owner ObjectType this Property is a stored field of, if known. */
  readonly ownerObjectName?: string;
  /** PropertyType (e.g. "String", "Integer") or a free-form value-type hint. */
  readonly dataType?: string;
  readonly whyItMayMatter?: string;
  readonly evidenceRefs?: readonly string[];
  readonly declaredRid?: string;
}

export interface LeadClarificationQuestion {
  readonly questionId: string;
  readonly phase: FDEOntologyEngineeringPhase;
  readonly plainQuestion: string;
  readonly whyItMatters: string;
  readonly recommendedDefault?: string;
  readonly blocking: boolean;
}

export interface ContextEngineeringPlanStub {
  readonly planId: string;
  readonly semanticIntentContractRef?: string;
  readonly dataSummary: string;
  readonly logicSummary: string;
  readonly actionSummary: string;
  readonly sourceRefs: readonly string[];
}

export type FDEReadinessRequirementKind =
  | "mission"
  | "latent-intent-decision"
  | "non-goals"
  | "evidence-classification"
  | "evidence"
  | "object"
  | "link"
  | "action"
  | "function"
  | "chatbot-context"
  | "application-state"
  | "evaluation"
  | "submission-criteria"
  | "governance";

export interface FDEReadinessRequirement {
  readonly requirementId: string;
  readonly kind: FDEReadinessRequirementKind;
  readonly label: string;
  readonly required: boolean;
  readonly description: string;
}

export interface FDEReadinessProfileRule {
  readonly ruleId: string;
  readonly requirementId: string;
  readonly severity: "required" | "recommended";
  readonly description: string;
}

export interface FDEReadinessProfile {
  readonly profileId: LatentIntentFamily;
  readonly label: string;
  readonly description: string;
  readonly requirements: readonly FDEReadinessRequirement[];
  readonly rules: readonly FDEReadinessProfileRule[];
  readonly allowsSemanticIntentDraft: boolean;
  readonly allowsDtcDraft: boolean;
}

export interface FDEReadinessRequirementResult {
  readonly requirementId: string;
  readonly satisfied: boolean;
  readonly evidence: readonly string[];
  readonly missing: string;
}

export interface FDEReadinessProfileEvaluation {
  readonly profileId: LatentIntentFamily;
  readonly score: number;
  readonly readyForSemanticIntent: boolean;
  readonly readyForDigitalTwin: boolean;
  readonly requirementResults: readonly FDEReadinessRequirementResult[];
  readonly missingRequired: readonly string[];
  readonly warnings: readonly string[];
}

export interface FDESemanticIntentContext {
  readonly schemaVersion: "palantir-mini/fde-semantic-intent-context/v1";
  readonly contextId: string;
  readonly sessionId: string;
  readonly projectRoot: string;
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly confirmedGoal?: string;
  readonly confirmedNonGoals: readonly string[];
  readonly acceptedHypotheses: readonly {
    readonly hypothesisId: string;
    readonly ruleId?: string;
    readonly family?: LatentIntentFamily;
    readonly plainLanguage: string;
    readonly whyLeadInferredThis?: string;
    readonly evidenceNeeded?: readonly string[];
    readonly readinessRequirementIds?: readonly string[];
    readonly sourceRefs: readonly string[];
  }[];
  readonly ontologyCandidates: {
    readonly objects: readonly string[];
    readonly links: readonly string[];
    readonly actions: readonly string[];
    readonly functions: readonly string[];
    readonly chatbotContexts: readonly string[];
  };
  readonly readinessProfile?: FDEReadinessProfileEvaluation;
  readonly trace: {
    readonly sourceTurnIds: readonly string[];
    readonly workflowTraceRef?: string;
    readonly ontologyContextQueryRef?: string;
    readonly semanticIntentContextRef?: string;
  };
  readonly acceptedHypothesisRuleIds: readonly string[];
  readonly readinessRequirementIds: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly createdAt: string;
}

export interface FDEOntologyTurnSummary {
  readonly turnId: string;
  readonly turnIndex: number;
  readonly leadSummary: string;
  readonly emittedAt: string;
}

export interface FDEOntologyEngineeringSession {
  readonly schemaVersion: typeof FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION;
  readonly sessionId: string;
  readonly projectRoot: string;
  readonly universalOntologyEntryRef: string;
  readonly ontologyContextQueryRef?: string;
  readonly workflowTraceRef?: string;
  readonly phase: FDEOntologyEngineeringPhase;
  readonly turnCount: number;
  readonly userFacingSummary: string;
  readonly confirmedUserGoal?: string;
  readonly confirmedNonGoals: readonly string[];
  readonly latentHypotheses: readonly LatentIntentHypothesis[];
  readonly acceptedHypothesisIds: readonly string[];
  readonly rejectedHypothesisIds: readonly string[];
  readonly deferredHypothesisIds?: readonly string[];
  readonly missionModel?: MissionDecisionModel;
  readonly evidenceModel?: EvidenceModel;
  readonly objectCandidates: readonly ObjectTypeCandidate[];
  readonly linkCandidates: readonly LinkTypeCandidate[];
  readonly actionCandidates: readonly ActionTypeCandidate[];
  readonly functionCandidates: readonly FunctionCandidate[];
  /**
   * Role (principal→permission grant) candidates — GOV-axis register path.
   * Optional (additive, post-dating the 12 existing session fixtures); the
   * register seam reads it as `session.roleCandidates ?? []`. Real sessions
   * always carry it (session-store initializes `roleCandidates: []`).
   */
  readonly roleCandidates?: readonly RoleCandidate[];
  /**
   * Property (an ObjectType's stored field) candidates — DATA-axis register path,
   * the completion alongside objectCandidates. Optional (additive, post-dating the
   * existing session fixtures); the register seam reads it as
   * `session.propertyCandidates ?? []`. Real sessions always carry it
   * (session-store initializes `propertyCandidates: []`).
   */
  readonly propertyCandidates?: readonly PropertyCandidate[];
  readonly chatbotContextCandidates: readonly ChatbotContextCandidate[];
  readonly contextEngineeringPlan?: ContextEngineeringPlanStub;
  readonly readinessProfileId?: LatentIntentFamily;
  readonly readinessProfile?: FDEReadinessProfileEvaluation;
  readonly semanticIntentContextRef?: string;
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly unresolvedQuestions: readonly LeadClarificationQuestion[];
  readonly stableSummary?: FDEOntologyStableSummary;
  readonly phaseHistory?: readonly FDEOntologyPhaseHistoryEntry[];
  readonly sourceRefs: readonly string[];
  readonly recentTurnSummaries: readonly FDEOntologyTurnSummary[];
  readonly turnRecordIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FDEOntologyTurnRecord {
  readonly schemaVersion: typeof FDE_ONTOLOGY_TURN_RECORD_SCHEMA_VERSION;
  readonly turnId: string;
  readonly sessionId: string;
  readonly turnIndex: number;
  readonly userMessageHash: string;
  readonly leadSummary: string;
  readonly acceptedHypothesisIds: readonly string[];
  readonly rejectedHypothesisIds: readonly string[];
  readonly deferredHypothesisIds: readonly string[];
  readonly newQuestions: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly emittedAt: string;
}

export interface FDEOntologyEngineeringCurrentPointer {
  readonly schemaVersion: "palantir-mini/fde-ontology-engineering-current/v1";
  readonly sessionId: string;
  readonly sessionRef: string;
  readonly projectRoot: string;
  readonly updatedAt: string;
}
