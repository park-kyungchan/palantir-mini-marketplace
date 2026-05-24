import {
  fdeOntologyEngineeringSessionRef,
  readFDEOntologyEngineeringSession,
  writeFDEOntologyTurnRecord,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../lib/fde-ontology-engineering/session-store";
import {
  processFDEOntologyEngineeringTurn,
  type FDEOntologyEngineeringTurnInput,
} from "../../lib/fde-ontology-engineering/turn-engine";
import {
  buildFDESemanticIntentContext,
  writeFDESemanticIntentContextSidecar,
} from "../../lib/fde-ontology-engineering/semantic-intent-context";
import {
  buildLeadOntologyTurnCard,
  buildLeadOntologyTurnCardV2,
  type LeadOntologyTurnCard,
  type LeadOntologyTurnCardV2,
} from "../../lib/chatbot-studio/lead-ontology-turn-card";
import {
  gradeFDEOntologyEngineeringSession,
  type FDEOntologyEngineeringSessionGrade,
} from "../../lib/fde-ontology-engineering/grade-session";
import type {
  FDEOntologyEngineeringSession,
  FDESemanticIntentContext,
} from "../../lib/fde-ontology-engineering/types";

export interface FDEOntologyTurnHandlerInput
  extends Omit<FDEOntologyEngineeringTurnInput, "session"> {
  readonly projectRoot: string;
  readonly sessionId?: string;
  readonly session?: FDEOntologyEngineeringSession;
}

export interface FDEOntologyTurnHandlerResult {
  readonly sessionRef: string;
  readonly session: FDEOntologyEngineeringSession;
  readonly grade: FDEOntologyEngineeringSessionGrade;
  readonly leadCard: LeadOntologyTurnCard;
  readonly leadCardV2: LeadOntologyTurnCardV2;
  readonly sidecar: FDESemanticIntentContext;
  readonly sidecarRef: string;
  readonly nextActions: readonly string[];
}

function resolveSession(input: FDEOntologyTurnHandlerInput): FDEOntologyEngineeringSession {
  if (input.session) return input.session;
  if (!input.sessionId) {
    throw new Error("fde-ontology-turn: session or sessionId is required");
  }
  const session = readFDEOntologyEngineeringSession(input.projectRoot, input.sessionId);
  if (!session) {
    throw new Error(`fde-ontology-turn: session not found: ${input.sessionId}`);
  }
  return session;
}

export async function handleFDEOntologyTurn(
  input: FDEOntologyTurnHandlerInput,
): Promise<FDEOntologyTurnHandlerResult> {
  const current = resolveSession(input);
  const processed = processFDEOntologyEngineeringTurn({
    session: current,
    sanitizedTurnSummary: input.sanitizedTurnSummary,
    rawUserMessage: input.rawUserMessage,
    userMessageHash: input.userMessageHash,
    turnId: input.turnId,
    acceptedHypothesisIds: input.acceptedHypothesisIds,
    rejectedHypothesisIds: input.rejectedHypothesisIds,
    deferredHypothesisIds: input.deferredHypothesisIds,
    choiceApplications: input.choiceApplications,
    signal: input.signal,
    emittedAt: input.emittedAt,
  });
  const sidecar = buildFDESemanticIntentContext(processed.session, input.emittedAt);
  const { contextRef } = writeFDESemanticIntentContextSidecar(sidecar);
  const sessionWithSidecar: FDEOntologyEngineeringSession = {
    ...processed.session,
    semanticIntentContextRef: contextRef,
    readinessProfile: sidecar.readinessProfile,
  };
  writeFDEOntologyTurnRecord(sessionWithSidecar.projectRoot, processed.record);
  writeFDEOntologyEngineeringSessionSnapshot(sessionWithSidecar);
  const grade = gradeFDEOntologyEngineeringSession(sessionWithSidecar, {
    readinessProfile: sessionWithSidecar.readinessProfileId,
  });
  const leadCard = buildLeadOntologyTurnCard({
    session: sessionWithSidecar,
    semanticIntentContext: sidecar,
  });
  const leadCardV2 = buildLeadOntologyTurnCardV2({
    session: sessionWithSidecar,
    semanticIntentContext: sidecar,
  });

  return {
    sessionRef: fdeOntologyEngineeringSessionRef(sessionWithSidecar.sessionId),
    session: sessionWithSidecar,
    grade,
    leadCard,
    leadCardV2,
    sidecar,
    sidecarRef: contextRef,
    nextActions: leadCard.nextActions,
  };
}

export default async function handler(rawArgs: unknown): Promise<FDEOntologyTurnHandlerResult> {
  return handleFDEOntologyTurn(rawArgs as FDEOntologyTurnHandlerInput);
}
