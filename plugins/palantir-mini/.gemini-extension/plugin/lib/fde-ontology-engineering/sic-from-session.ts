import type { SemanticIntentContract } from "../lead-intent/contracts";
import type { FDEOntologyEngineeringSession } from "./types";

export interface FDEOntologyEngineeringSicDraftOptions {
  readonly contractId?: string;
  readonly affectedSurfaces?: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function acceptedHypothesisSummaries(session: FDEOntologyEngineeringSession): readonly string[] {
  const accepted = new Set(session.acceptedHypothesisIds);
  return session.latentHypotheses
    .filter((hypothesis) => accepted.has(hypothesis.hypothesisId))
    .map((hypothesis) => hypothesis.plainLanguage);
}

function confirmedIntent(session: FDEOntologyEngineeringSession): string {
  return (
    session.stableSummary?.confirmedIntent
    ?? session.confirmedUserGoal
    ?? session.missionModel?.operationalDecision
    ?? "FDE ontology engineering session requires more accepted mission state."
  );
}

export function createSemanticIntentContractDraftFromFDEOntologySession(
  session: FDEOntologyEngineeringSession,
  options: FDEOntologyEngineeringSicDraftOptions = {},
): SemanticIntentContract {
  const acceptedSummaries = acceptedHypothesisSummaries(session);
  const nouns = unique([
    ...session.objectCandidates.map((candidate) => candidate.plainName),
    ...session.linkCandidates.map((candidate) => candidate.plainName),
    ...session.chatbotContextCandidates.map((candidate) => candidate.plainName),
  ]);
  const verbs = unique([
    ...session.actionCandidates.map((candidate) => candidate.plainName),
    ...session.functionCandidates.map((candidate) => candidate.plainName),
  ]);
  const intent = confirmedIntent(session);

  return {
    contractId: options.contractId ?? `semantic-intent:fde-session:${session.sessionId}`,
    status: "draft",
    rawIntent: intent,
    confirmedIntent: [
      intent,
      ...acceptedSummaries,
    ].join("\n"),
    nonGoals: [...session.confirmedNonGoals],
    approvedNouns: nouns,
    approvedVerbs: verbs,
    affectedSurfaces: unique([
      ...(options.affectedSurfaces ?? []),
      ...session.sourceRefs,
    ]),
    permissionsAndProposal: "Drafted from accepted FDE ontology engineering session state; not from raw prompt text.",
    acceptedRisks: (session.deferredHypothesisIds ?? []).map((id) => `Deferred hypothesis remains open: ${id}`),
    downstreamAllowed: [
      "Use accepted session state to review SemanticIntentContract fields.",
      "Ask additional FDE ontology engineering questions for unresolved gaps.",
    ],
    downstreamForbidden: [
      "Do not authorize ontology mutation from this draft alone.",
      "Do not rehydrate raw prompt text into the contract.",
    ],
    clarificationQuestions: session.unresolvedQuestions.map((question) => ({
      questionId: question.questionId,
      ambiguityType: "decision",
      materiality: question.blocking ? "blocking" : "important",
      decisionSpec: {
        decisionId: question.questionId,
        phase: question.phase,
        plainKoreanTitle: "FDE 결정 필요",
        plainKoreanSummary: question.plainQuestion,
        whyItMatters: question.whyItMatters,
        recommendedChoiceId: `${question.questionId}.answer`,
        choices: [
          {
            choiceId: `${question.questionId}.answer`,
            label: "답변 반영",
            consequence: question.recommendedDefault ?? "Answer before contract approval.",
            recommended: true,
          },
          {
            choiceId: `${question.questionId}.defer`,
            label: "보류",
            consequence: "The contract remains draft and cannot authorize downstream execution.",
            recommended: false,
          },
        ],
        evidenceRefs: session.sourceRefs,
        blocking: question.blocking,
        freeTextAllowed: true,
        stateEffectPreview: "Record a UserDecisionRecord before SIC approval.",
      },
      whyItMatters: question.whyItMatters,
      plainLanguageExplanation: question.whyItMatters,
      palantirArchitectureMapping: {
        operationalMeaning: question.phase,
        platformTerm: "Ontology Proposal",
      },
      defaultIfUserAcceptsRecommendation: question.recommendedDefault ?? "Keep as an open clarification.",
      whatWillNotHappen: [
        "No ontology edit will be authorized from an unresolved clarification.",
      ],
      requiresUserApproval: question.blocking,
      status: "open",
    })),
  };
}
