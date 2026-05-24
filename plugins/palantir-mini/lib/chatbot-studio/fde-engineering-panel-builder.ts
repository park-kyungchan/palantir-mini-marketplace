import type {
  FDEOntologyEngineeringPhase,
  FDEOntologyEngineeringSession,
  LatentIntentHypothesis,
} from "../fde-ontology-engineering/types";

export const FDE_ENGINEERING_PANEL_SCHEMA_VERSION =
  "palantir-mini/fde-engineering-panel/v1" as const;

export interface FDEEngineeringDecisionProjection {
  readonly hypothesisId: string;
  readonly plainLanguage: string;
  readonly recommendedDefault: string;
  readonly sourceRefs: readonly string[];
}

export interface FDEEngineeringPanelProjection {
  readonly schemaVersion: typeof FDE_ENGINEERING_PANEL_SCHEMA_VERSION;
  readonly phase: FDEOntologyEngineeringPhase;
  readonly latentHypotheses: readonly {
    readonly hypothesisId: string;
    readonly status: LatentIntentHypothesis["status"];
    readonly plainLanguage: string;
    readonly whyLeadInferredThis: string;
    readonly evidenceNeeded: readonly string[];
    readonly sourceRefs: readonly string[];
  }[];
  readonly decisions: {
    readonly accepted: readonly FDEEngineeringDecisionProjection[];
    readonly rejected: readonly FDEEngineeringDecisionProjection[];
    readonly deferred: readonly FDEEngineeringDecisionProjection[];
  };
  readonly currentOntologyShape: {
    readonly objects: readonly string[];
    readonly links: readonly string[];
    readonly actions: readonly string[];
    readonly functions: readonly string[];
    readonly chatbotContexts: readonly string[];
  };
  readonly nextQuestions: readonly {
    readonly questionId: string;
    readonly phase: FDEOntologyEngineeringPhase;
    readonly plainQuestion: string;
    readonly whyItMatters: string;
    readonly blocking: boolean;
  }[];
  readonly readiness: {
    readonly semanticIntentReady: boolean;
    readonly digitalTwinReady: boolean;
    readonly sicDtcReady: boolean;
    readonly semanticIntentContractRef?: string;
    readonly digitalTwinChangeContractRef?: string;
    readonly blockingQuestionCount: number;
  };
  readonly mutationAuthorizedFromPanel: false;
}

export interface BuildFDEEngineeringPanelInput {
  readonly session: FDEOntologyEngineeringSession;
}

function projectionForHypothesis(
  hypothesis: LatentIntentHypothesis,
): FDEEngineeringDecisionProjection {
  return {
    hypothesisId: hypothesis.hypothesisId,
    plainLanguage: hypothesis.plainLanguage,
    recommendedDefault: hypothesis.recommendedDefault,
    sourceRefs: hypothesis.sourceRefs,
  };
}

function hypothesisById(
  session: FDEOntologyEngineeringSession,
  hypothesisId: string,
): LatentIntentHypothesis | undefined {
  return session.latentHypotheses.find((hypothesis) => hypothesis.hypothesisId === hypothesisId);
}

function selectedHypotheses(
  session: FDEOntologyEngineeringSession,
  ids: readonly string[],
  status: LatentIntentHypothesis["status"],
): readonly FDEEngineeringDecisionProjection[] {
  const fromIds = ids
    .map((id) => hypothesisById(session, id))
    .filter((hypothesis): hypothesis is LatentIntentHypothesis => hypothesis !== undefined);
  const fromStatus = session.latentHypotheses.filter((hypothesis) => hypothesis.status === status);
  const seen = new Set<string>();
  return [...fromIds, ...fromStatus]
    .filter((hypothesis) => {
      if (seen.has(hypothesis.hypothesisId)) return false;
      seen.add(hypothesis.hypothesisId);
      return true;
    })
    .map(projectionForHypothesis);
}

export function buildFDEEngineeringPanel(
  input: BuildFDEEngineeringPanelInput,
): FDEEngineeringPanelProjection {
  const { session } = input;
  const semanticIntentReady =
    session.phase === "semantic-contract-ready" ||
    session.phase === "dtc-ready" ||
    typeof session.semanticIntentContractRef === "string";
  const digitalTwinReady =
    session.phase === "dtc-ready" ||
    typeof session.digitalTwinChangeContractRef === "string";

  return {
    schemaVersion: FDE_ENGINEERING_PANEL_SCHEMA_VERSION,
    phase: session.phase,
    latentHypotheses: session.latentHypotheses.map((hypothesis) => ({
      hypothesisId: hypothesis.hypothesisId,
      status: hypothesis.status,
      plainLanguage: hypothesis.plainLanguage,
      whyLeadInferredThis: hypothesis.whyLeadInferredThis,
      evidenceNeeded: hypothesis.evidenceNeeded,
      sourceRefs: hypothesis.sourceRefs,
    })),
    decisions: {
      accepted: selectedHypotheses(session, session.acceptedHypothesisIds, "accepted"),
      rejected: selectedHypotheses(session, session.rejectedHypothesisIds, "rejected"),
      deferred: selectedHypotheses(session, [], "deferred"),
    },
    currentOntologyShape: {
      objects: session.objectCandidates.map((candidate) => candidate.plainName),
      links: session.linkCandidates.map((candidate) => candidate.plainName),
      actions: session.actionCandidates.map((candidate) => candidate.plainName),
      functions: session.functionCandidates.map((candidate) => candidate.plainName),
      chatbotContexts: session.chatbotContextCandidates.map((candidate) => candidate.plainName),
    },
    nextQuestions: session.unresolvedQuestions.map((question) => ({
      questionId: question.questionId,
      phase: question.phase,
      plainQuestion: question.plainQuestion,
      whyItMatters: question.whyItMatters,
      blocking: question.blocking,
    })),
    readiness: {
      semanticIntentReady,
      digitalTwinReady,
      sicDtcReady: semanticIntentReady && digitalTwinReady,
      ...(session.semanticIntentContractRef
        ? { semanticIntentContractRef: session.semanticIntentContractRef }
        : {}),
      ...(session.digitalTwinChangeContractRef
        ? { digitalTwinChangeContractRef: session.digitalTwinChangeContractRef }
        : {}),
      blockingQuestionCount: session.unresolvedQuestions.filter((question) => question.blocking)
        .length,
    },
    mutationAuthorizedFromPanel: false,
  };
}
