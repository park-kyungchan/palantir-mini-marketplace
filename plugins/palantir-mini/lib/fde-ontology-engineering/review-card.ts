import { gradeFDEOntologyEngineeringSession } from "./grade-session";
import type {
  FDEOntologyEngineeringSession,
  FDEOntologyEngineeringPhase,
} from "./types";
import type {
  FDEOntologyEngineeringSessionGrade,
  FDEOntologyEngineeringSessionVerdict,
} from "./grade-session";

export interface FDEOntologyEngineeringReviewCard {
  readonly title: string;
  readonly sessionId: string;
  readonly phase: FDEOntologyEngineeringPhase;
  readonly verdict: FDEOntologyEngineeringSessionVerdict;
  readonly summary: string;
  readonly accepted: readonly string[];
  readonly deferred: readonly string[];
  readonly rejected: readonly string[];
  readonly openQuestions: readonly string[];
  readonly nextAction: string;
  readonly grade: FDEOntologyEngineeringSessionGrade;
}

function hypothesisText(session: FDEOntologyEngineeringSession, ids: readonly string[]): readonly string[] {
  const byId = new Map(
    session.latentHypotheses.map((hypothesis) => [hypothesis.hypothesisId, hypothesis.plainLanguage]),
  );
  return ids.map((id) => byId.get(id) ?? id);
}

function nextAction(verdict: FDEOntologyEngineeringSessionVerdict): string {
  switch (verdict) {
    case "ready-for-dtc":
      return "Proceed to Digital Twin change contract approval or review.";
    case "ready-for-semantic-contract":
      return "Draft or review the SemanticIntentContract from accepted session state.";
    case "reject":
      return "Stop and re-open the mission decision before drafting contracts.";
    case "continue-turns":
      return "Continue FDE ontology engineering turns until missing state is resolved.";
  }
}

export function buildFDEOntologyEngineeringReviewCard(
  session: FDEOntologyEngineeringSession,
): FDEOntologyEngineeringReviewCard {
  const grade = gradeFDEOntologyEngineeringSession(session);
  return {
    title: "FDE Ontology Engineering Review",
    sessionId: session.sessionId,
    phase: session.phase,
    verdict: grade.verdict,
    summary:
      session.stableSummary?.confirmedIntent
      ?? session.stableSummary?.missionSummary
      ?? session.userFacingSummary,
    accepted: hypothesisText(session, session.acceptedHypothesisIds),
    deferred: hypothesisText(session, session.deferredHypothesisIds ?? []),
    rejected: hypothesisText(session, session.rejectedHypothesisIds),
    openQuestions: session.unresolvedQuestions.map((question) => question.plainQuestion),
    nextAction: nextAction(grade.verdict),
    grade,
  };
}
