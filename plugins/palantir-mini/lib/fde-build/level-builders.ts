/**
 * palantir-mini lib/fde-build/level-builders.ts
 *
 * 9 pure builder functions — one per FDE review level. Each builder accepts
 * a LevelBuilderInput (loose-typed bag from the composer) and returns the
 * corresponding FDE*Review shape. No I/O, no side effects, no mutation.
 *
 * Read-only invariant: NONE of these builders produce commitToken, applyToken,
 * approvalToken, or authorizeMutation fields. Mutation authority stays with
 * SemanticIntentContract + DigitalTwinChangeContract (lib/lead-intent/contracts.ts).
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 1.B
 */

import type {
  FDEMissionDecision,
  FDEObjectTypeReview,
  FDELinkTypeReview,
  FDEActionWritebackReview,
  FDEFunctionReview,
  FDEChatbotStudioReview,
  FDEAIFDEMcpBoundaryReview,
  FDEBranchReleaseReview,
  FDEEvalObservabilityReview,
  FDEReviewLevelGap,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";

// =============================================================================
// Input contract
// =============================================================================

/**
 * Loose-typed input bag passed from the composer to every level builder.
 * All fields are optional — builders degrade gracefully when inputs are absent.
 */
export interface LevelBuilderInput {
  /** OntologyContextQueryResult from mcp__palantir-mini__ontology_context_query */
  readonly ontologyContext?: unknown;
  /** Approved SemanticIntentContract from lib/lead-intent/contracts.ts */
  readonly semanticIntentContract?: unknown;
  /** Approved DigitalTwinChangeContract from lib/lead-intent/contracts.ts */
  readonly digitalTwinChangeContract?: unknown;
  /** SemanticConversationState from lib/chatbot-studio/semantic-conversation-state.ts */
  readonly semanticConversationState?: unknown;
  /** ISO8601 timestamp supplied by the composer for deterministic gap IDs. */
  readonly nowIso?: string;
  /** Stable caller-provided seed supplied by the composer for deterministic gap IDs. */
  readonly stableSeed?: string;
}

// =============================================================================
// Internal helpers
// =============================================================================

function safeGet<T>(obj: unknown, ...keys: string[]): T | undefined {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur as T | undefined;
}

function safeArray<T>(obj: unknown, ...keys: string[]): readonly T[] {
  const val = safeGet<T[]>(obj, ...keys);
  return Array.isArray(val) ? val : [];
}

function stableGapId(
  input: LevelBuilderInput,
  prefix: string,
  ...parts: ReadonlyArray<string | number | undefined>
): string {
  const seed = input.stableSeed ?? input.nowIso ?? "stable";
  const normalized = [prefix, ...parts, seed]
    .map((part) => String(part ?? "missing"))
    .join("-")
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return normalized.length > 0 ? normalized : "gap-stable";
}

function missingInputGap(input: LevelBuilderInput, level: FDEReviewLevelGap["level"]): FDEReviewLevelGap {
  return {
    gapId: stableGapId(input, "gap-missing-input", level),
    level,
    severity: "medium",
    description: `No input data available for ${level} review. Provide ontologyContext, semanticIntentContract, or semanticConversationState.`,
    recommendedAction: "Invoke mcp__palantir-mini__ontology_context_query and pass the result to the composer.",
    nextQuestion: `What is the operational decision this ${level.replace(/-/g, " ")} work supports?`,
  };
}

function hasAnyInput(input: LevelBuilderInput): boolean {
  return (
    input.ontologyContext != null ||
    input.semanticIntentContract != null ||
    input.digitalTwinChangeContract != null ||
    input.semanticConversationState != null
  );
}

// =============================================================================
// Level 1 — Mission Decision (§7.1)
// =============================================================================

export function buildMissionDecision(input: LevelBuilderInput): FDEMissionDecision {
  if (!hasAnyInput(input)) {
    return {
      unresolvedGaps: [missingInputGap(input, "mission-decision")],
    };
  }

  const ctx = input.ontologyContext;
  const sic = input.semanticIntentContract as Record<string, unknown> | undefined;
  const conv = input.semanticConversationState;

  const useCaseName =
    safeGet<string>(sic, "useCaseName") ??
    safeGet<string>(conv, "userFacing", "plainRequestSummary") ??
    safeGet<string>(ctx, "missionContext", "useCaseName");

  const operationalDecision =
    safeGet<string>(sic, "operationalDecision") ??
    safeGet<string>(ctx, "missionContext", "operationalDecision");

  const gaps: FDEReviewLevelGap[] = [];
  if (!useCaseName && !operationalDecision) {
    gaps.push({
      gapId: stableGapId(input, "gap-mission-no-use-case"),
      level: "mission-decision",
      severity: "blocking",
      description: "Neither useCaseName nor operationalDecision is defined. The mission is unclear.",
      recommendedAction: "Define a concrete operational decision this chatbot/agent surface improves.",
      nextQuestion: "What is the operational decision this work improves?",
    });
  }

  return {
    useCaseName,
    operationalDecision,
    decisionOwnerRole: safeGet<string>(sic, "decisionOwnerRole") ?? safeGet<string>(ctx, "missionContext", "decisionOwnerRole"),
    decisionFrequency: safeGet<string>(ctx, "missionContext", "decisionFrequency"),
    currentDecisionPath: safeGet<string>(ctx, "missionContext", "currentDecisionPath"),
    targetDecisionPath: safeGet<string>(ctx, "missionContext", "targetDecisionPath"),
    evidenceObjectsRequired: safeArray<string>(ctx, "missionContext", "evidenceObjectsRequired"),
    actionRequiredAfterDecision: safeGet<string>(ctx, "missionContext", "actionRequiredAfterDecision"),
    successMetrics: safeArray<string>(ctx, "missionContext", "successMetrics"),
    unresolvedGaps: gaps.length > 0 ? gaps : undefined,
  };
}

// =============================================================================
// Level 2 — Object Type Reviews (§7.2)
// =============================================================================

export function buildObjectTypeReviews(input: LevelBuilderInput): readonly FDEObjectTypeReview[] {
  if (!hasAnyInput(input)) {
    return [];
  }

  const ctx = input.ontologyContext;
  const rawTypes = safeArray<unknown>(ctx, "objectTypes");
  if (rawTypes.length === 0) {
    return [];
  }

  return rawTypes.map((rawType) => {
    const gaps: FDEReviewLevelGap[] = [];
    const name = safeGet<string>(rawType, "objectTypeName") ?? safeGet<string>(rawType, "name") ?? "unknown";

    if (!safeGet<string>(rawType, "primaryKeyStrategy") && !safeGet<string>(rawType, "primaryKeyField")) {
      gaps.push({
        gapId: stableGapId(input, "gap-obj-pk", name),
        level: "object-type",
        severity: "high",
        description: `ObjectType '${name}' has no declared primary key strategy.`,
        recommendedAction: "Define primaryKeyStrategy (e.g. 'natural-key', 'surrogate-uuid').",
        nextQuestion: `What uniquely identifies a '${name}' record in the source system?`,
      });
    }

    return {
      objectTypeName: name,
      isRealWorldEntityOrEvent: safeGet<"entity" | "event">(rawType, "isRealWorldEntityOrEvent"),
      primaryKeyStrategy: safeGet<string>(rawType, "primaryKeyStrategy") ?? safeGet<string>(rawType, "primaryKeyField"),
      humanMeaningfulTitleProperty: safeGet<string>(rawType, "humanMeaningfulTitleProperty") ?? safeGet<string>(rawType, "titleProperty"),
      requiredProperties: safeArray<string>(rawType, "requiredProperties"),
      optionalProperties: safeArray<string>(rawType, "optionalProperties"),
      sourceDatasets: safeArray<string>(rawType, "sourceDatasets"),
      writebackStatus: safeGet<"none" | "draft" | "approved">(rawType, "writebackStatus"),
      objectViewStatus: safeGet<"absent" | "draft" | "ready">(rawType, "objectViewStatus"),
      consumingAppsOrChatbots: safeArray<string>(rawType, "consumingAppsOrChatbots"),
      riskLevel: safeGet<"low" | "medium" | "high">(rawType, "riskLevel"),
      gaps: gaps.length > 0 ? gaps : undefined,
    };
  });
}

// =============================================================================
// Level 3 — Link Type Reviews (§7.3)
// =============================================================================

export function buildLinkTypeReviews(input: LevelBuilderInput): readonly FDELinkTypeReview[] {
  if (!hasAnyInput(input)) {
    return [];
  }

  const ctx = input.ontologyContext;
  const rawLinks = safeArray<unknown>(ctx, "linkTypes");
  if (rawLinks.length === 0) {
    return [];
  }

  return rawLinks.map((rawLink) => {
    const name = safeGet<string>(rawLink, "linkTypeName") ?? safeGet<string>(rawLink, "name") ?? "unknown";
    const gaps: FDEReviewLevelGap[] = [];

    if (!safeGet<string>(rawLink, "businessMeaning")) {
      gaps.push({
        gapId: stableGapId(input, "gap-link-meaning", name),
        level: "link-type",
        severity: "medium",
        description: `LinkType '${name}' has no declared businessMeaning.`,
        recommendedAction: "Describe what traversing this link means to a business analyst.",
        nextQuestion: `What does it mean when a user follows the '${name}' link?`,
      });
    }

    return {
      linkTypeName: name,
      sourceObjectType: safeGet<string>(rawLink, "sourceObjectType"),
      targetObjectType: safeGet<string>(rawLink, "targetObjectType"),
      businessMeaning: safeGet<string>(rawLink, "businessMeaning"),
      cardinality: safeGet<"1-to-1" | "1-to-many" | "many-to-many">(rawLink, "cardinality"),
      backingDatasource: safeGet<string>(rawLink, "backingDatasource"),
      traversalUseCases: safeArray<string>(rawLink, "traversalUseCases"),
      chatbotExposurePolicy: safeGet<"exposed" | "hidden" | "scoped">(rawLink, "chatbotExposurePolicy"),
      gaps: gaps.length > 0 ? gaps : undefined,
    };
  });
}

// =============================================================================
// Level 4 — Action / Writeback Reviews (§7.4)
// =============================================================================

export function buildActionWritebackReviews(input: LevelBuilderInput): readonly FDEActionWritebackReview[] {
  if (!hasAnyInput(input)) {
    return [];
  }

  const ctx = input.ontologyContext;
  const rawActions = safeArray<unknown>(ctx, "actionTypes");
  if (rawActions.length === 0) {
    return [];
  }

  return rawActions.map((rawAction) => {
    const name = safeGet<string>(rawAction, "actionTypeName") ?? safeGet<string>(rawAction, "name") ?? "unknown";
    const gaps: FDEReviewLevelGap[] = [];
    const submissionCriteriaNeedsHumanReview: string[] = [];

    // Detect deferred-to-v1 submission criteria (ObjectQueryResult, GroupMember)
    const criteria = safeArray<string>(rawAction, "submissionCriteria");
    for (const criterion of criteria) {
      if (
        criterion.includes("ObjectQueryResult") ||
        criterion.includes("GroupMember") ||
        criterion.includes("object-query-result") ||
        criterion.includes("group-member")
      ) {
        submissionCriteriaNeedsHumanReview.push(criterion);
      }
    }

    if (!safeGet<string>(rawAction, "operationalIntent")) {
      gaps.push({
        gapId: stableGapId(input, "gap-action-intent", name),
        level: "action-writeback",
        severity: "high",
        description: `Action '${name}' has no operationalIntent declared.`,
        recommendedAction: "Describe what business decision or workflow this action serves.",
        nextQuestion: `Why would a user invoke '${name}'? What decision does it record or trigger?`,
      });
    }

    return {
      actionTypeName: name,
      operationalIntent: safeGet<string>(rawAction, "operationalIntent"),
      createdObjects: safeArray<string>(rawAction, "createdObjects"),
      modifiedObjects: safeArray<string>(rawAction, "modifiedObjects"),
      deletedObjects: safeArray<string>(rawAction, "deletedObjects"),
      modifiedLinks: safeArray<string>(rawAction, "modifiedLinks"),
      requiredParameters: safeArray<string>(rawAction, "requiredParameters"),
      sideEffects: safeArray<string>(rawAction, "sideEffects"),
      submissionCriteria: criteria.length > 0 ? criteria : undefined,
      chatbotConfirmationPolicy: safeGet<"always" | "high-impact-only" | "never">(rawAction, "chatbotConfirmationPolicy"),
      writebackDataset: safeGet<string>(rawAction, "writebackDataset"),
      auditEvidence: safeArray<string>(rawAction, "auditEvidence"),
      submissionCriteriaNeedsHumanReview: submissionCriteriaNeedsHumanReview.length > 0 ? submissionCriteriaNeedsHumanReview : undefined,
      gaps: gaps.length > 0 ? gaps : undefined,
    };
  });
}

// =============================================================================
// Level 5 — Function Reviews (§7.5)
// =============================================================================

export function buildFunctionReviews(input: LevelBuilderInput): readonly FDEFunctionReview[] {
  if (!hasAnyInput(input)) {
    return [];
  }

  const ctx = input.ontologyContext;
  const rawFunctions = safeArray<unknown>(ctx, "functions");
  if (rawFunctions.length === 0) {
    return [];
  }

  return rawFunctions.map((rawFn) => {
    const name = safeGet<string>(rawFn, "functionName") ?? safeGet<string>(rawFn, "name") ?? "unknown";
    const gaps: FDEReviewLevelGap[] = [];

    if (!safeGet<string>(rawFn, "inputContract") && !safeGet<string>(rawFn, "outputContract")) {
      gaps.push({
        gapId: stableGapId(input, "gap-fn-contract", name),
        level: "function",
        severity: "medium",
        description: `Function '${name}' has no declared input/output contract.`,
        recommendedAction: "Document input types + expected output format for this function.",
        nextQuestion: `What inputs does '${name}' require and what does it return?`,
      });
    }

    return {
      functionName: name,
      functionType: safeGet<string>(rawFn, "functionType"),
      ontologyResourcesUsed: safeArray<string>(rawFn, "ontologyResourcesUsed"),
      inputContract: safeGet<string>(rawFn, "inputContract"),
      outputContract: safeGet<string>(rawFn, "outputContract"),
      deterministic: safeGet<boolean>(rawFn, "deterministic"),
      chatbotToolUsage: safeArray<string>(rawFn, "chatbotToolUsage"),
      actionUsage: safeArray<string>(rawFn, "actionUsage"),
      evalSuite: safeGet<string>(rawFn, "evalSuite"),
      versionPolicy: safeGet<string>(rawFn, "versionPolicy"),
      gaps: gaps.length > 0 ? gaps : undefined,
    };
  });
}

// =============================================================================
// Level 6 — Chatbot Studio Reviews (§7.6)
// =============================================================================

export function buildChatbotStudioReviews(input: LevelBuilderInput): readonly FDEChatbotStudioReview[] {
  if (!hasAnyInput(input)) {
    return [];
  }

  const ctx = input.ontologyContext;
  const rawChatbots = safeArray<unknown>(ctx, "chatbots");
  if (rawChatbots.length === 0) {
    return [];
  }

  return rawChatbots.map((rawBot) => {
    const name = safeGet<string>(rawBot, "chatbotName") ?? safeGet<string>(rawBot, "name") ?? "unknown";
    const gaps: FDEReviewLevelGap[] = [];

    if (!safeGet<string>(rawBot, "evalSuite")) {
      gaps.push({
        gapId: stableGapId(input, "gap-chatbot-eval", name),
        level: "chatbot-studio",
        severity: "medium",
        description: `Chatbot '${name}' has no declared evalSuite. Nondeterministic surfaces require AIP Evals.`,
        recommendedAction: "Author an eval suite via /palantir-mini:pm-eval-suite and cross-ref here.",
        nextQuestion: `What test cases verify '${name}' responds correctly to representative user queries?`,
      });
    }

    return {
      chatbotName: name,
      legacyNamingFindings: safeArray<string>(rawBot, "legacyNamingFindings"),
      ontologyScope: safeArray<string>(rawBot, "ontologyScope"),
      actionScope: safeArray<string>(rawBot, "actionScope"),
      functionScope: safeArray<string>(rawBot, "functionScope"),
      retrievalContext: safeArray<string>(rawBot, "retrievalContext"),
      documentContext: safeArray<string>(rawBot, "documentContext"),
      functionBackedContext: safeArray<string>(rawBot, "functionBackedContext"),
      toolSet: safeArray<string>(rawBot, "toolSet"),
      applicationStateVariables: safeArray<string>(rawBot, "applicationStateVariables"),
      citationPolicy: safeGet<"required" | "optional" | "none">(rawBot, "citationPolicy"),
      confirmationPolicy: safeGet<"always" | "high-impact-only" | "never">(rawBot, "confirmationPolicy"),
      evalSuite: safeGet<string>(rawBot, "evalSuite"),
      sessionTraceAvailable: safeGet<boolean>(rawBot, "sessionTraceAvailable"),
      gaps: gaps.length > 0 ? gaps : undefined,
    };
  });
}

// =============================================================================
// Level 7 — AI FDE / MCP Boundary Review (§7.7)
// =============================================================================

export function buildAIFDEMcpBoundaryReview(input: LevelBuilderInput): FDEAIFDEMcpBoundaryReview | undefined {
  if (!hasAnyInput(input)) {
    return undefined;
  }

  const ctx = input.ontologyContext;
  const boundary = safeGet<unknown>(ctx, "aiFdeMcpBoundary");
  if (!boundary) {
    return undefined;
  }

  const gaps: FDEReviewLevelGap[] = [];
  const mutatingToolsRequireApproval = safeGet<boolean>(boundary, "mutatingToolsRequireApproval");
  if (mutatingToolsRequireApproval == null) {
    gaps.push({
      gapId: stableGapId(input, "gap-mcp-approval-policy"),
      level: "ai-fde-mcp-boundary",
      severity: "high",
      description: "mutatingToolsRequireApproval is not declared for the AI FDE / MCP boundary.",
      recommendedAction: "Explicitly set mutatingToolsRequireApproval=true for all write-path MCP tools.",
      nextQuestion: "Do any MCP-exposed tools perform writes without requiring human approval?",
    });
  }

  return {
    taskKind: safeGet<"builder-side-structure" | "consumer-side-data-access" | "mixed">(boundary, "taskKind"),
    palantirMcpInScope: safeGet<boolean>(boundary, "palantirMcpInScope"),
    ontologyMcpInScope: safeGet<boolean>(boundary, "ontologyMcpInScope"),
    localPluginAnalogueInScope: safeGet<boolean>(boundary, "localPluginAnalogueInScope"),
    mutatingToolsRequireApproval,
    branchProposalPolicy: safeGet<string>(boundary, "branchProposalPolicy"),
    auditPolicy: safeGet<string>(boundary, "auditPolicy"),
    gaps: gaps.length > 0 ? gaps : undefined,
  };
}

// =============================================================================
// Level 8 — Branch + Release Review (§7.8)
// =============================================================================

export function buildBranchReleaseReview(input: LevelBuilderInput): FDEBranchReleaseReview | undefined {
  if (!hasAnyInput(input)) {
    return undefined;
  }

  const ctx = input.ontologyContext;
  const branch = safeGet<unknown>(ctx, "branchRelease");
  if (!branch) {
    return undefined;
  }

  const gaps: FDEReviewLevelGap[] = [];

  if (!safeGet<string>(branch, "rollbackPlan")) {
    gaps.push({
      gapId: stableGapId(input, "gap-branch-rollback"),
      level: "branch-release",
      severity: "medium",
      description: "No rollback plan declared for this ontology branch.",
      recommendedAction: "Define a rollback plan that describes how to revert the branch if post-merge issues arise.",
      nextQuestion: "If this branch merge causes a regression, how will it be rolled back?",
    });
  }

  return {
    branchName: safeGet<string>(branch, "branchName"),
    branchRequirement: safeGet<string>(branch, "branchRequirement"),
    resourcesChanged: safeArray<string>(branch, "resourcesChanged"),
    actionsTestedOnBranch: safeArray<string>(branch, "actionsTestedOnBranch"),
    reviewersRequired: safeArray<string>(branch, "reviewersRequired"),
    approvalStatus: safeGet<"pending" | "approved" | "rejected">(branch, "approvalStatus"),
    mergeConflictRisks: safeArray<string>(branch, "mergeConflictRisks"),
    rollbackPlan: safeGet<string>(branch, "rollbackPlan"),
    gaps: gaps.length > 0 ? gaps : undefined,
  };
}

// =============================================================================
// Level 9 — Eval + Observability Review (§7.9)
// =============================================================================

export function buildEvalObservabilityReview(input: LevelBuilderInput): FDEEvalObservabilityReview | undefined {
  if (!hasAnyInput(input)) {
    return undefined;
  }

  const ctx = input.ontologyContext;
  const evalObs = safeGet<unknown>(ctx, "evalObservability");
  if (!evalObs) {
    return undefined;
  }

  const gaps: FDEReviewLevelGap[] = [];
  const latestPassRate = safeGet<number>(evalObs, "latestPassRate");

  if (!safeGet<string>(evalObs, "evalSuiteName")) {
    gaps.push({
      gapId: stableGapId(input, "gap-eval-suite-name"),
      level: "eval-observability",
      severity: "high",
      description: "No evalSuiteName declared for the observability review.",
      recommendedAction: "Reference a named AIP Evals suite that covers key user flows.",
      nextQuestion: "Which AIP Evals suite covers this chatbot/agent's primary use cases?",
    });
  }

  if (latestPassRate !== undefined && latestPassRate < 0.8) {
    gaps.push({
      gapId: stableGapId(input, "gap-eval-pass-rate"),
      level: "eval-observability",
      severity: "blocking",
      description: `latestPassRate is ${latestPassRate * 100}%, below the 80% minimum for semantic approval.`,
      recommendedAction: "Improve the eval suite pass rate before requesting semantic approval.",
      nextQuestion: "Which failing test cases need to be addressed to reach 80% pass rate?",
    });
  }

  return {
    evalSuiteName: safeGet<string>(evalObs, "evalSuiteName"),
    targetFunctions: safeArray<string>(evalObs, "targetFunctions"),
    chatbotTargets: safeArray<string>(evalObs, "chatbotTargets"),
    ontologyEditSimulationRequired: safeGet<boolean>(evalObs, "ontologyEditSimulationRequired"),
    manualTestCases: safeArray<string>(evalObs, "manualTestCases"),
    generatedTestCases: safeArray<string>(evalObs, "generatedTestCases"),
    evaluators: safeArray<string>(evalObs, "evaluators"),
    passCriteria: safeGet<string>(evalObs, "passCriteria"),
    latestPassRate,
    varianceChecks: safeArray<string>(evalObs, "varianceChecks"),
    regressionBaseline: safeGet<string>(evalObs, "regressionBaseline"),
    auditSessionTraceEvidence: safeArray<string>(evalObs, "auditSessionTraceEvidence"),
    gaps: gaps.length > 0 ? gaps : undefined,
  };
}
