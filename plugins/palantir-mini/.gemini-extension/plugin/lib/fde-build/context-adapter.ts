/**
 * Adapt canonical ontology_context_query output and/or an
 * FDEOntologyEngineeringSession into the FDE level-builder input shape.
 *
 * Pure adapter only. Convex-backed evalRunsContext is treated as observability
 * evidence, never as semantic authority.
 */

import type { FDEOntologyEngineeringSession } from "../fde-ontology-engineering/types";
import type { LevelBuilderInput } from "./level-builders";

export interface AdaptFDEContextInput {
  readonly ontologyContext?: unknown;
  readonly fdeOntologyEngineeringSession?: unknown;
  readonly semanticIntentContract?: unknown;
  readonly digitalTwinChangeContract?: unknown;
  readonly semanticConversationState?: unknown;
  readonly nowIso?: string;
  readonly stableSeed?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getRecord(value: unknown, ...keys: string[]): Record<string, unknown> | undefined {
  let cur: unknown = value;
  for (const key of keys) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return isRecord(cur) ? cur : undefined;
}

function getString(value: unknown, ...keys: string[]): string | undefined {
  let cur: unknown = value;
  for (const key of keys) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return typeof cur === "string" && cur.trim().length > 0 ? cur : undefined;
}

function getNumber(value: unknown, ...keys: string[]): number | undefined {
  let cur: unknown = value;
  for (const key of keys) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return typeof cur === "number" && Number.isFinite(cur) ? cur : undefined;
}

function getBoolean(value: unknown, ...keys: string[]): boolean | undefined {
  let cur: unknown = value;
  for (const key of keys) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return typeof cur === "boolean" ? cur : undefined;
}

function getArray<T = unknown>(value: unknown, ...keys: string[]): readonly T[] {
  let cur: unknown = value;
  for (const key of keys) {
    if (!isRecord(cur)) return [];
    cur = cur[key];
  }
  return Array.isArray(cur) ? (cur as readonly T[]) : [];
}

function asStringArray(values: readonly unknown[]): readonly string[] {
  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function firstString(...values: ReadonlyArray<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0);
}

function maybeFDEOntologyEngineeringSession(value: unknown): FDEOntologyEngineeringSession | undefined {
  if (!isRecord(value)) return undefined;
  const schemaVersion = getString(value, "schemaVersion");
  const sessionId = getString(value, "sessionId");
  const projectRoot = getString(value, "projectRoot");
  if (
    schemaVersion === "palantir-mini/fde-ontology-engineering-session/v1" &&
    sessionId !== undefined &&
    projectRoot !== undefined
  ) {
    return value as unknown as FDEOntologyEngineeringSession;
  }
  return undefined;
}

function hasFDEBuilderShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isRecord(value["missionContext"]) ||
    Array.isArray(value["objectTypes"]) ||
    Array.isArray(value["linkTypes"]) ||
    Array.isArray(value["actionTypes"]) ||
    Array.isArray(value["functions"]) ||
    Array.isArray(value["chatbots"]) ||
    isRecord(value["aiFdeMcpBoundary"]) ||
    isRecord(value["branchRelease"]) ||
    isRecord(value["evalObservability"])
  );
}

function extractSession(input: AdaptFDEContextInput): FDEOntologyEngineeringSession | undefined {
  return (
    maybeFDEOntologyEngineeringSession(input.fdeOntologyEngineeringSession) ??
    maybeFDEOntologyEngineeringSession(getRecord(input.ontologyContext, "fdeOntologyEngineeringSession")) ??
    maybeFDEOntologyEngineeringSession(getRecord(input.ontologyContext, "fdeOntologyEngineeringProjection", "session"))
  );
}

function buildMissionContext(session: FDEOntologyEngineeringSession | undefined, ontologyContext: unknown): Record<string, unknown> | undefined {
  const existing = getRecord(ontologyContext, "missionContext");
  if (existing !== undefined) return existing;
  if (session === undefined) return undefined;
  return {
    useCaseName: firstString(
      session.missionModel?.useCaseName,
      session.confirmedUserGoal,
      session.stableSummary?.confirmedIntent,
      session.userFacingSummary,
    ),
    operationalDecision: firstString(
      session.missionModel?.operationalDecision,
      session.stableSummary?.missionSummary,
      session.confirmedUserGoal,
    ),
    decisionOwnerRole: session.missionModel?.decisionOwnerRole,
    successMetrics: session.missionModel?.successSignals ?? [],
    evidenceObjectsRequired: session.objectCandidates.map((candidate) => candidate.plainName),
  };
}

function buildObjectTypes(session: FDEOntologyEngineeringSession | undefined, ontologyContext: unknown): readonly Record<string, unknown>[] {
  const existing = getArray<Record<string, unknown>>(ontologyContext, "objectTypes");
  if (existing.length > 0 || session === undefined) return existing;
  return session.objectCandidates.map((candidate) => ({
    objectTypeName: candidate.plainName,
    primaryKeyStrategy: "fde-candidate-id",
    requiredProperties: ["candidateId"],
    sourceDatasets: candidate.evidenceRefs,
    consumingAppsOrChatbots: session.chatbotContextCandidates.map((chatbot) => chatbot.plainName),
    riskLevel: "medium",
  }));
}

function buildLinkTypes(session: FDEOntologyEngineeringSession | undefined, ontologyContext: unknown): readonly Record<string, unknown>[] {
  const existing = getArray<Record<string, unknown>>(ontologyContext, "linkTypes");
  if (existing.length > 0 || session === undefined) return existing;
  return session.linkCandidates.map((candidate) => ({
    linkTypeName: candidate.plainName,
    sourceObjectType: candidate.sourceObject,
    targetObjectType: candidate.targetObject,
    businessMeaning: candidate.businessMeaning,
    traversalUseCases: candidate.evidenceRefs,
    chatbotExposurePolicy: "scoped",
  }));
}

function buildActionTypes(session: FDEOntologyEngineeringSession | undefined, ontologyContext: unknown): readonly Record<string, unknown>[] {
  const existing = getArray<Record<string, unknown>>(ontologyContext, "actionTypes");
  if (existing.length > 0 || session === undefined) return existing;
  return session.actionCandidates.map((candidate) => ({
    actionTypeName: candidate.plainName,
    operationalIntent: candidate.operationalIntent,
    sideEffects: [`writebackRisk:${candidate.writebackRisk}`],
    auditEvidence: candidate.evidenceRefs,
    chatbotConfirmationPolicy: candidate.writebackRisk === "high" ? "always" : "high-impact-only",
  }));
}

function buildFunctions(session: FDEOntologyEngineeringSession | undefined, ontologyContext: unknown): readonly Record<string, unknown>[] {
  const existing = getArray<Record<string, unknown>>(ontologyContext, "functions");
  if (existing.length > 0 || session === undefined) return existing;
  return session.functionCandidates.map((candidate) => ({
    functionName: candidate.plainName,
    functionType: "fde-candidate",
    inputContract: candidate.logicIntent,
    outputContract: `Reviewed output for ${candidate.plainName}`,
    deterministic: candidate.deterministic,
  }));
}

function latestEvalRun(ontologyContext: unknown): Record<string, unknown> | undefined {
  const runs = getArray<Record<string, unknown>>(ontologyContext, "evalRunsContext", "recentRuns");
  return runs[0];
}

function evalRunPassRate(ontologyContext: unknown): number | undefined {
  const runs = getArray<Record<string, unknown>>(ontologyContext, "evalRunsContext", "recentRuns");
  if (runs.length === 0) return undefined;
  const passed = runs.filter((run) => getString(run, "status") === "passed").length;
  return passed / runs.length;
}

function buildChatbots(session: FDEOntologyEngineeringSession | undefined, ontologyContext: unknown): readonly Record<string, unknown>[] {
  const existing = getArray<Record<string, unknown>>(ontologyContext, "chatbots");
  if (existing.length > 0 || session === undefined) return existing;
  const evalSuite = firstString(
    getString(ontologyContext, "evalObservability", "evalSuiteName"),
    getString(latestEvalRun(ontologyContext), "suiteId"),
  );
  return session.chatbotContextCandidates.map((candidate) => ({
    chatbotName: candidate.plainName,
    ontologyScope: session.objectCandidates.map((object) => object.plainName),
    actionScope: session.actionCandidates.map((action) => action.plainName),
    functionScope: session.functionCandidates.map((fn) => fn.plainName),
    retrievalContext: candidate.retrievalContextNeed !== undefined ? [candidate.retrievalContextNeed] : [],
    applicationStateVariables: [candidate.applicationStateNeed],
    citationPolicy: "required",
    confirmationPolicy: "high-impact-only",
    evalSuite,
    sessionTraceAvailable: session.turnRecordIds.length > 0,
  }));
}

function buildAIFDEBoundary(ontologyContext: unknown, digitalTwinChangeContract: unknown): Record<string, unknown> | undefined {
  const existing = getRecord(ontologyContext, "aiFdeMcpBoundary");
  if (existing !== undefined) return existing;
  if (digitalTwinChangeContract === undefined) return undefined;
  return {
    taskKind: "mixed",
    localPluginAnalogueInScope: true,
    mutatingToolsRequireApproval: true,
    branchProposalPolicy: getString(digitalTwinChangeContract, "branchProposalPolicy"),
    auditPolicy: getString(digitalTwinChangeContract, "observabilityPlan"),
  };
}

function buildBranchRelease(ontologyContext: unknown, digitalTwinChangeContract: unknown): Record<string, unknown> | undefined {
  const existing = getRecord(ontologyContext, "branchRelease");
  if (existing !== undefined) return existing;
  if (digitalTwinChangeContract === undefined) return undefined;
  return {
    branchRequirement: getString(digitalTwinChangeContract, "branchProposalPolicy"),
    resourcesChanged: asStringArray(getArray(digitalTwinChangeContract, "affectedSurfaces")),
    approvalStatus: getString(digitalTwinChangeContract, "status") === "approved" ? "approved" : "pending",
    rollbackPlan: getString(digitalTwinChangeContract, "replayMigrationPlan"),
  };
}

function buildEvalObservability(ontologyContext: unknown, session: FDEOntologyEngineeringSession | undefined): Record<string, unknown> | undefined {
  const existing = getRecord(ontologyContext, "evalObservability");
  if (existing !== undefined) return existing;

  const latestRun = latestEvalRun(ontologyContext);
  const evalSuiteName = firstString(
    getString(latestRun, "suiteId"),
    getString(ontologyContext, "retrievalContext", "evalCoverage", "suitePaths", "0"),
  );
  const suiteCount = getNumber(ontologyContext, "retrievalContext", "evalCoverage", "suiteCount");
  if (latestRun === undefined && evalSuiteName === undefined && suiteCount === undefined) return undefined;

  const targetRid = getString(getRecord(latestRun, "target"), "rid");
  const latestPassRate = evalRunPassRate(ontologyContext) ?? getNumber(latestRun, "aggregateScore");
  const lastRunAt = getString(ontologyContext, "evalRunsContext", "lastRunAt");
  return {
    evalSuiteName: evalSuiteName ?? "eval-runs-context",
    targetFunctions: targetRid !== undefined ? [targetRid] : session?.functionCandidates.map((candidate) => candidate.plainName) ?? [],
    chatbotTargets: session?.chatbotContextCandidates.map((candidate) => candidate.plainName) ?? [],
    ontologyEditSimulationRequired: true,
    evaluators: ["evalRunsContext"],
    passCriteria: "evalRunsContext is observability evidence only; semantic authority remains SIC/DTC.",
    latestPassRate,
    varianceChecks: ["convex-eval-runs-observability-only"],
    regressionBaseline: lastRunAt !== undefined ? `lastRunAt:${lastRunAt}` : undefined,
    auditSessionTraceEvidence: [
      ...(lastRunAt !== undefined ? [`evalRunsContext:lastRunAt:${lastRunAt}`] : []),
      ...getArray<Record<string, unknown>>(ontologyContext, "evalRunsContext", "recentRuns")
        .map((run) => getString(run, "runId"))
        .filter((runId): runId is string => runId !== undefined)
        .map((runId) => `evalRun:${runId}`),
    ],
  };
}

function buildSemanticConversationState(
  existing: unknown,
  _session: FDEOntologyEngineeringSession | undefined,
): unknown {
  return existing;
}

function buildAdaptedOntologyContext(input: AdaptFDEContextInput): unknown {
  const original = isRecord(input.ontologyContext) ? input.ontologyContext : {};
  const session = extractSession(input);
  if (session === undefined && hasFDEBuilderShape(original)) {
    return {
      ...original,
      evalObservability: buildEvalObservability(original, undefined) ?? original["evalObservability"],
    };
  }

  const evalObservability = buildEvalObservability(original, session);
  const contextWithDerivedEval =
    evalObservability !== undefined ? { ...original, evalObservability } : original;

  return {
    ...original,
    ...(session !== undefined ? { fdeOntologyEngineeringSession: session } : {}),
    missionContext: buildMissionContext(session, original),
    objectTypes: buildObjectTypes(session, original),
    linkTypes: buildLinkTypes(session, original),
    actionTypes: buildActionTypes(session, original),
    functions: buildFunctions(session, original),
    chatbots: buildChatbots(session, contextWithDerivedEval),
    aiFdeMcpBoundary: buildAIFDEBoundary(original, input.digitalTwinChangeContract),
    branchRelease: buildBranchRelease(original, input.digitalTwinChangeContract),
    evalObservability,
  };
}

export function adaptFDEContextToLevelBuilderInput(input: AdaptFDEContextInput): LevelBuilderInput {
  return {
    ontologyContext: buildAdaptedOntologyContext(input),
    semanticIntentContract: input.semanticIntentContract,
    digitalTwinChangeContract: input.digitalTwinChangeContract,
    semanticConversationState: buildSemanticConversationState(
      input.semanticConversationState,
      extractSession(input),
    ),
    nowIso: input.nowIso,
    stableSeed: input.stableSeed,
  };
}
