import {
  applyFDEOntologyTurnRecordToSession,
  createFDEOntologyTurnRecord,
  hashFDEOntologyTurnMessage,
} from "./session-store";
import { deriveImplicitIntentPatch } from "./implicit-intent";
import {
  resolveFDEOntologyTurnChoiceApplications,
  type FDEOntologyTurnChoiceApplication,
} from "./turn-choice";
import type {
  ActionTypeCandidate,
  ChatbotContextCandidate,
  EvidenceModel,
  FDEOntologyEngineeringPhase,
  FDEOntologyEngineeringSession,
  FDEOntologyPhaseHistoryEntry,
  FDEOntologyStableSummary,
  FDEOntologyTurnRecord,
  FunctionCandidate,
  LatentIntentHypothesis,
  LeadClarificationQuestion,
  LinkTypeCandidate,
  MissionDecisionModel,
  ObjectTypeCandidate,
} from "./types";
import type { FDEImplicitIntentSignal } from "./implicit-intent";

export interface FDEOntologyEngineeringTurnInput {
  readonly session: FDEOntologyEngineeringSession;
  readonly sanitizedTurnSummary: string;
  readonly rawUserMessage?: string;
  readonly userMessageHash?: string;
  readonly turnId?: string;
  readonly acceptedHypothesisIds?: readonly string[];
  readonly rejectedHypothesisIds?: readonly string[];
  readonly deferredHypothesisIds?: readonly string[];
  readonly choiceApplications?: readonly FDEOntologyTurnChoiceApplication[];
  readonly signal?: Omit<FDEImplicitIntentSignal, "sanitizedTurnSummary">;
  readonly emittedAt?: string;
}

export interface FDEOntologyEngineeringTurnResult {
  readonly record: FDEOntologyTurnRecord;
  readonly session: FDEOntologyEngineeringSession;
}

type CandidateWithId =
  | LatentIntentHypothesis
  | ObjectTypeCandidate
  | LinkTypeCandidate
  | ActionTypeCandidate
  | FunctionCandidate
  | ChatbotContextCandidate;

function candidateId(candidate: CandidateWithId): string {
  if ("hypothesisId" in candidate) return candidate.hypothesisId;
  return candidate.candidateId;
}

function mergeById<T extends CandidateWithId>(
  current: readonly T[],
  incoming: readonly T[],
  statusIds?: {
    readonly accepted: ReadonlySet<string>;
    readonly rejected: ReadonlySet<string>;
    readonly deferred: ReadonlySet<string>;
  },
): readonly T[] {
  const byId = new Map<string, T>();
  for (const item of current) byId.set(candidateId(item), item);
  for (const item of incoming) byId.set(candidateId(item), item);

  if (statusIds === undefined) return Array.from(byId.values());

  return Array.from(byId.values()).map((item) => {
    if (!("hypothesisId" in item)) return item;
    const status =
      statusIds.accepted.has(item.hypothesisId) ? "accepted"
      : statusIds.rejected.has(item.hypothesisId) ? "rejected"
      : statusIds.deferred.has(item.hypothesisId) ? "deferred"
      : item.status;
    return { ...item, status } as T;
  });
}

function mergeStrings(...groups: readonly (readonly string[] | undefined)[]): readonly string[] {
  return Array.from(new Set(groups.flatMap((group) => group ?? []).filter((value) => value.length > 0)));
}

function currentDeferredHypothesisIds(session: FDEOntologyEngineeringSession): readonly string[] {
  return session.deferredHypothesisIds ?? [];
}

function phaseHistory(session: FDEOntologyEngineeringSession): readonly FDEOntologyPhaseHistoryEntry[] {
  return session.phaseHistory ?? [{
    phase: session.phase,
    enteredAt: session.createdAt,
    reason: "Backfilled phase history for a legacy session snapshot.",
  }];
}

function mergeMission(
  current: MissionDecisionModel | undefined,
  incoming: MissionDecisionModel | undefined,
): MissionDecisionModel | undefined {
  if (current === undefined) return incoming;
  if (incoming === undefined) return current;
  return {
    useCaseName: incoming.useCaseName ?? current.useCaseName,
    operationalDecision: incoming.operationalDecision ?? current.operationalDecision,
    decisionOwnerRole: incoming.decisionOwnerRole ?? current.decisionOwnerRole,
    successSignals: mergeStrings(current.successSignals, incoming.successSignals),
  };
}

function mergeEvidence(
  current: EvidenceModel | undefined,
  incoming: EvidenceModel | undefined,
): EvidenceModel | undefined {
  if (current === undefined) return incoming;
  if (incoming === undefined) return current;
  return {
    evidenceDefinition: incoming.evidenceDefinition ?? current.evidenceDefinition,
    observableSignals: mergeStrings(current.observableSignals, incoming.observableSignals),
    sourceArtifactRefs: mergeStrings(current.sourceArtifactRefs, incoming.sourceArtifactRefs),
    missingEvidenceQuestions: mergeStrings(
      current.missingEvidenceQuestions,
      incoming.missingEvidenceQuestions,
    ),
  };
}

function blockingQuestionKey(question: LeadClarificationQuestion): string {
  return question.questionId;
}

function mergeQuestions(
  current: readonly LeadClarificationQuestion[],
  incoming: readonly LeadClarificationQuestion[],
  session: FDEOntologyEngineeringSession,
): readonly LeadClarificationQuestion[] {
  const byId = new Map<string, LeadClarificationQuestion>();
  for (const question of current) byId.set(blockingQuestionKey(question), question);
  for (const question of incoming) byId.set(blockingQuestionKey(question), question);

  if (mergeMission(session.missionModel, undefined) !== undefined) {
    byId.delete("fde.mission-decision.required");
  }

  return Array.from(byId.values());
}

function derivePhase(session: FDEOntologyEngineeringSession): FDEOntologyEngineeringPhase {
  if (session.digitalTwinChangeContractRef !== undefined) return "dtc-ready";
  if (session.semanticIntentContractRef !== undefined) return "semantic-contract-ready";
  if (session.missionModel?.operationalDecision === undefined) return "mission-decision";
  if (session.missionModel.decisionOwnerRole === undefined) return "learner-or-user-context";
  if (session.evidenceModel?.evidenceDefinition === undefined) return "evidence-definition";
  if (session.objectCandidates.length === 0) return "object-type-discovery";
  if (session.linkCandidates.length === 0) return "link-type-discovery";
  if (session.actionCandidates.length === 0) return "action-writeback-discovery";
  if (session.functionCandidates.length === 0) return "function-logic-discovery";
  if (session.chatbotContextCandidates.length === 0) return "chatbot-application-state";
  if (session.unresolvedQuestions.some((question) => question.blocking)) return "governance-eval";
  return "semantic-contract-ready";
}

function describeOntology(session: FDEOntologyEngineeringSession): string | undefined {
  const parts = [
    session.objectCandidates.length > 0 ? `${session.objectCandidates.length} object candidate(s)` : undefined,
    session.linkCandidates.length > 0 ? `${session.linkCandidates.length} link candidate(s)` : undefined,
    session.actionCandidates.length > 0 ? `${session.actionCandidates.length} action candidate(s)` : undefined,
    session.functionCandidates.length > 0 ? `${session.functionCandidates.length} function candidate(s)` : undefined,
    session.chatbotContextCandidates.length > 0
      ? `${session.chatbotContextCandidates.length} chatbot context candidate(s)`
      : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function stableSummaryForSession(
  session: FDEOntologyEngineeringSession,
  updatedAt: string,
): FDEOntologyStableSummary {
  const blockingQuestions = session.unresolvedQuestions.filter((question) => question.blocking);
  const confirmedIntent =
    session.confirmedUserGoal
    ?? session.missionModel?.operationalDecision
    ?? session.stableSummary?.confirmedIntent;

  return {
    confirmedIntent,
    missionSummary: session.missionModel?.operationalDecision,
    evidenceSummary: session.evidenceModel?.evidenceDefinition,
    ontologySummary: describeOntology(session),
    governanceSummary:
      blockingQuestions.length === 0
        ? "No blocking clarification questions are currently open."
        : `${blockingQuestions.length} blocking clarification question(s) remain open.`,
    acceptedHypothesisCount: session.acceptedHypothesisIds.length,
    rejectedHypothesisCount: session.rejectedHypothesisIds.length,
    deferredHypothesisCount: currentDeferredHypothesisIds(session).length,
    unresolvedBlockingQuestionCount: blockingQuestions.length,
    sourceTurnIds: session.turnRecordIds,
    updatedAt,
  };
}

function phaseHistoryForSession(
  session: FDEOntologyEngineeringSession,
  nextPhase: FDEOntologyEngineeringPhase,
  record: FDEOntologyTurnRecord,
): readonly FDEOntologyPhaseHistoryEntry[] {
  if (session.phase === nextPhase) return phaseHistory(session);
  return [
    ...phaseHistory(session),
    {
      phase: nextPhase,
      previousPhase: session.phase,
      enteredAt: record.emittedAt,
      reason: `Turn ${record.turnIndex} advanced FDE ontology engineering readiness.`,
      turnId: record.turnId,
    },
  ];
}

export function processFDEOntologyEngineeringTurn(
  input: FDEOntologyEngineeringTurnInput,
): FDEOntologyEngineeringTurnResult {
  const patch = deriveImplicitIntentPatch({
    sanitizedTurnSummary: input.sanitizedTurnSummary,
    ...input.signal,
  });
  const choiceResolution = resolveFDEOntologyTurnChoiceApplications(input.choiceApplications);
  const acceptedHypothesisIds = mergeStrings(
    input.acceptedHypothesisIds,
    choiceResolution.acceptedHypothesisIds,
  );
  const rejectedHypothesisIds = mergeStrings(
    input.rejectedHypothesisIds,
    choiceResolution.rejectedHypothesisIds,
  );
  const deferredHypothesisIds = mergeStrings(
    input.deferredHypothesisIds,
    choiceResolution.deferredHypothesisIds,
  );
  const emittedAt = input.emittedAt ?? new Date().toISOString();
  const leadSummary = [
    input.sanitizedTurnSummary,
    ...choiceResolution.sanitizedAnswers.map((answer) => `Choice answer: ${answer}`),
  ].join("\n");
  const userMessageHash =
    input.userMessageHash
    ?? (input.rawUserMessage !== undefined
      ? hashFDEOntologyTurnMessage(input.rawUserMessage)
      : hashFDEOntologyTurnMessage(input.sanitizedTurnSummary));

  const record = createFDEOntologyTurnRecord({
    sessionId: input.session.sessionId,
    turnIndex: input.session.turnCount,
    turnId: input.turnId,
    userMessageHash,
    leadSummary,
    acceptedHypothesisIds,
    rejectedHypothesisIds,
    deferredHypothesisIds,
    sourceRefs: mergeStrings(patch.sourceRefs, choiceResolution.sourceRefs),
    newQuestions: patch.unresolvedQuestions.map((question) => question.questionId),
    emittedAt,
  });
  const afterRecord = applyFDEOntologyTurnRecordToSession(input.session, record);
  const accepted = new Set(mergeStrings(afterRecord.acceptedHypothesisIds, acceptedHypothesisIds));
  const rejected = new Set(mergeStrings(afterRecord.rejectedHypothesisIds, rejectedHypothesisIds));
  const deferred = new Set(mergeStrings(
    currentDeferredHypothesisIds(afterRecord),
    deferredHypothesisIds,
  ));

  const nextSessionBase: FDEOntologyEngineeringSession = {
    ...afterRecord,
    confirmedUserGoal:
      afterRecord.confirmedUserGoal
      ?? patch.missionModel?.operationalDecision
      ?? afterRecord.confirmedUserGoal,
    latentHypotheses: mergeById(afterRecord.latentHypotheses, patch.latentHypotheses, {
      accepted,
      rejected,
      deferred,
    }),
    acceptedHypothesisIds: Array.from(accepted),
    rejectedHypothesisIds: Array.from(rejected),
    deferredHypothesisIds: Array.from(deferred),
    missionModel: mergeMission(afterRecord.missionModel, patch.missionModel),
    evidenceModel: mergeEvidence(afterRecord.evidenceModel, patch.evidenceModel),
    objectCandidates: mergeById(afterRecord.objectCandidates, patch.objectCandidates),
    linkCandidates: mergeById(afterRecord.linkCandidates, patch.linkCandidates),
    actionCandidates: mergeById(afterRecord.actionCandidates, patch.actionCandidates),
    functionCandidates: mergeById(afterRecord.functionCandidates, patch.functionCandidates),
    chatbotContextCandidates: mergeById(
      afterRecord.chatbotContextCandidates,
      patch.chatbotContextCandidates,
    ),
    unresolvedQuestions: mergeQuestions(afterRecord.unresolvedQuestions, patch.unresolvedQuestions, {
      ...afterRecord,
      missionModel: mergeMission(afterRecord.missionModel, patch.missionModel),
    }),
    sourceRefs: mergeStrings(afterRecord.sourceRefs, patch.sourceRefs, choiceResolution.sourceRefs),
    updatedAt: emittedAt,
  };
  const nextPhase = derivePhase(nextSessionBase);
  const nextSession: FDEOntologyEngineeringSession = {
    ...nextSessionBase,
    phase: nextPhase,
    phaseHistory: phaseHistoryForSession(nextSessionBase, nextPhase, record),
    stableSummary: stableSummaryForSession(nextSessionBase, emittedAt),
  };

  return { record, session: nextSession };
}
