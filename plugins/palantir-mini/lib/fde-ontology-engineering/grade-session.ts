import type { FDEOntologyEngineeringSession } from "./types";
import { evaluateFDEReadinessProfile } from "./readiness-profile";
import type {
  FDEReadinessProfile,
  FDEReadinessProfileEvaluation,
  LatentIntentFamily,
} from "./types";

export type FDEOntologyEngineeringSessionVerdict =
  | "continue-turns"
  | "ready-for-semantic-contract"
  | "ready-for-dtc"
  | "reject";

export interface FDEOntologyEngineeringSessionGrade {
  readonly verdict: FDEOntologyEngineeringSessionVerdict;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly missing: readonly string[];
  readonly readinessProfile?: FDEReadinessProfileEvaluation;
}

export interface GradeFDEOntologyEngineeringSessionOptions {
  readonly readinessProfile?: FDEReadinessProfile | LatentIntentFamily;
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

/**
 * OE-14 / D1-4 — the number of graded readiness dimensions `missing` can grow to:
 * 3 mission-state checks (mission decision, decision owner, evidence definition)
 * + 5 candidate-presence checks (object/link/action/function/chatbot context)
 * + 1 blocking-clarification check = 9. The score denominator MUST equal this count
 * (the prior `/ 8` constant was a stale 9÷8 mismatch — a fully-incomplete session
 * could underflow `completed` to -1 before the Math.max clamp). Single-sourced here
 * so adding/removing a `missing.push` check keeps the denominator honest.
 */
const TOTAL_GRADED_DIMENSIONS = 9;

export function gradeFDEOntologyEngineeringSession(
  session: FDEOntologyEngineeringSession,
  options: GradeFDEOntologyEngineeringSessionOptions = {},
): FDEOntologyEngineeringSessionGrade {
  const missing: string[] = [];
  const reasons: string[] = [];
  const profileRequested = options.readinessProfile !== undefined || session.readinessProfileId !== undefined;
  const readinessProfile =
    options.readinessProfile !== undefined
      ? evaluateFDEReadinessProfile(session, options.readinessProfile)
      : session.readinessProfile ?? (
          profileRequested
            ? evaluateFDEReadinessProfile(session, session.readinessProfileId)
            : undefined
        );

  if (!hasText(session.confirmedUserGoal) && !hasText(session.missionModel?.operationalDecision)) {
    missing.push("mission decision");
  }
  if (!hasText(session.missionModel?.decisionOwnerRole)) {
    missing.push("decision owner");
  }
  if (!hasText(session.evidenceModel?.evidenceDefinition)) {
    missing.push("evidence definition");
  }
  if (session.objectCandidates.length === 0) missing.push("object candidates");
  if (session.linkCandidates.length === 0) missing.push("link candidates");
  if (session.actionCandidates.length === 0) missing.push("action candidates");
  if (session.functionCandidates.length === 0) missing.push("function candidates");
  if (session.chatbotContextCandidates.length === 0) missing.push("chatbot context candidates");

  const blockingQuestionCount = session.unresolvedQuestions.filter((question) => question.blocking).length;
  if (blockingQuestionCount > 0) {
    missing.push("blocking clarification resolution");
  }

  const rejectedWithoutAccepted =
    session.rejectedHypothesisIds.length > 0
    && session.acceptedHypothesisIds.length === 0
    && missing.includes("mission decision");
  if (rejectedWithoutAccepted) {
    reasons.push("Session has rejected hypotheses but no accepted mission state.");
    return {
      verdict: "reject",
      score: 0,
      reasons,
      missing,
      ...(readinessProfile !== undefined ? { readinessProfile } : {}),
    };
  }

  if (
    session.semanticIntentContractRef !== undefined
    && session.digitalTwinChangeContractRef !== undefined
  ) {
    reasons.push("Semantic intent and Digital Twin contract refs are both present.");
    return {
      verdict: "ready-for-dtc",
      score: 1,
      reasons,
      missing: [],
      ...(readinessProfile !== undefined ? { readinessProfile } : {}),
    };
  }

  if (readinessProfile?.readyForSemanticIntent) {
    reasons.push(
      `Readiness profile ${readinessProfile.profileId} is complete enough to draft a semantic contract.`,
    );
    return {
      verdict: "ready-for-semantic-contract",
      score: readinessProfile.score,
      reasons,
      missing: [],
      readinessProfile,
    };
  }

  const completed = TOTAL_GRADED_DIMENSIONS - missing.length;
  const score = Math.max(0, Math.min(1, completed / TOTAL_GRADED_DIMENSIONS));

  if (missing.length === 0) {
    reasons.push("Required FDE ontology engineering state is complete enough to draft a semantic contract.");
    return {
      verdict: "ready-for-semantic-contract",
      score,
      reasons,
      missing,
      ...(readinessProfile !== undefined ? { readinessProfile } : {}),
    };
  }

  const effectiveMissing = readinessProfile?.missingRequired.length
    ? readinessProfile.missingRequired
    : missing;
  reasons.push(`Continue FDE turns; missing ${effectiveMissing.join(", ")}.`);
  return {
    verdict: "continue-turns",
    score: readinessProfile?.score ?? score,
    reasons,
    missing: effectiveMissing,
    ...(readinessProfile !== undefined ? { readinessProfile } : {}),
  };
}
