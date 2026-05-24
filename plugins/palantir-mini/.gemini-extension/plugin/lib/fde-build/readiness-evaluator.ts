/**
 * palantir-mini lib/fde-build/readiness-evaluator.ts
 *
 * Pure readiness verdict evaluator. Given a partial FDEOntologyBuildSession
 * (the per-level data aggregated by the composer) and a hasApprovedSIC flag,
 * ascends the readiness ladder and returns a verdict + completedLevels + nextQuestion.
 *
 * No I/O, no side effects, no mutation. Verdict is advisory only — it does not
 * authorize any commit/apply/approve.
 *
 * Ladder (ascending):
 *   not-ready → mission-clear → object-link-clear → action-clear
 *   → chatbot-clear → eval-clear → ready-for-semantic-approval
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 1.B
 */

import type {
  FDEOntologyBuildSession,
  FDEReadinessVerdict,
  FDEReviewLevel,
  FDEReviewLevelGap,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";

// =============================================================================
// Input / output types
// =============================================================================

type ReadinessInput = Pick<
  FDEOntologyBuildSession,
  | "missionDecision"
  | "objectTypes"
  | "linkTypes"
  | "actionWriteback"
  | "functions"
  | "chatbotStudio"
  | "aiFdeMcpBoundary"
  | "branchRelease"
  | "evalObservability"
  | "allGaps"
>;

export interface ReadinessResult {
  readonly readiness: FDEReadinessVerdict;
  readonly completedLevels: readonly FDEReviewLevel[];
  readonly nextQuestion?: string;
}

// =============================================================================
// Helper predicates
// =============================================================================

function hasBlockingGap(gaps: readonly FDEReviewLevelGap[] | undefined): boolean {
  return (gaps ?? []).some((g) => g.severity === "blocking");
}

function hasBlockingGapInLevel(
  allGaps: readonly FDEReviewLevelGap[],
  level: FDEReviewLevel,
): boolean {
  return allGaps.some((g) => g.level === level && g.severity === "blocking");
}

function firstNextQuestion(gaps: readonly FDEReviewLevelGap[]): string | undefined {
  return gaps.find((g) => g.nextQuestion != null)?.nextQuestion;
}

function hasSubmissionCriteriaNeedingHumanReview(
  partial: ReadinessInput,
): boolean {
  return partial.actionWriteback.some(
    (a) =>
      a.submissionCriteriaNeedsHumanReview != null &&
      a.submissionCriteriaNeedsHumanReview.length > 0,
  );
}

// =============================================================================
// Main evaluator
// =============================================================================

/**
 * Evaluate the readiness verdict for a composed FDE session.
 *
 * @param partial - the per-level data fields from FDEOntologyBuildSession
 * @param hasApprovedSIC - true when a semanticIntentContractRef is present + approved
 * @returns ReadinessResult with verdict, completedLevels, and nextQuestion
 */
export function evaluateReadiness(
  partial: ReadinessInput,
  hasApprovedSIC: boolean,
): ReadinessResult {
  const completedLevels: FDEReviewLevel[] = [];

  // -------------------------------------------------------------------------
  // Gate 0: not-ready
  // Mission decision must define at least useCaseName OR operationalDecision.
  // -------------------------------------------------------------------------
  const mission = partial.missionDecision;
  const missionDefined =
    mission != null &&
    ((mission.useCaseName != null && mission.useCaseName.trim() !== "") ||
      (mission.operationalDecision != null &&
        mission.operationalDecision.trim() !== ""));

  if (!missionDefined) {
    const firstGap = firstNextQuestion(partial.allGaps);
    return {
      readiness: "not-ready",
      completedLevels,
      nextQuestion:
        firstGap ?? "What is the operational decision this work improves?",
    };
  }

  // Mission is clear — even if unresolvedGaps exist, we've at least named the problem.
  const missionHasBlockingGap = hasBlockingGap(mission.unresolvedGaps);
  if (!missionHasBlockingGap) {
    completedLevels.push("mission-decision");
  }

  // -------------------------------------------------------------------------
  // Gate 1: mission-clear
  // objectTypes or linkTypes are still empty, OR blocking gaps in mission.
  // -------------------------------------------------------------------------
  const hasObjects = partial.objectTypes.length > 0;
  const hasLinks = partial.linkTypes.length > 0;

  if (!hasObjects || !hasLinks) {
    const firstGap = firstNextQuestion(partial.allGaps);
    return {
      readiness: "mission-clear",
      completedLevels,
      nextQuestion:
        firstGap ??
        (!hasObjects
          ? "What are the core objects (entities or events) this use case tracks?"
          : "What relationships (link types) connect those objects?"),
    };
  }

  // Check for blocking gaps at object-type or link-type level.
  const objectBlockingGap = hasBlockingGapInLevel(partial.allGaps, "object-type");
  const linkBlockingGap = hasBlockingGapInLevel(partial.allGaps, "link-type");

  if (objectBlockingGap || linkBlockingGap) {
    const firstGap = firstNextQuestion(
      partial.allGaps.filter(
        (g) => g.level === "object-type" || g.level === "link-type",
      ),
    );
    return {
      readiness: "mission-clear",
      completedLevels,
      nextQuestion: firstGap ?? "Resolve blocking gaps in object or link type definitions.",
    };
  }

  completedLevels.push("object-type");
  completedLevels.push("link-type");

  // -------------------------------------------------------------------------
  // Gate 2: object-link-clear
  // actionWriteback must have ≥ 1 entry and no blocking gaps in any reviewed level.
  // submissionCriteriaNeedsHumanReview must be empty.
  // -------------------------------------------------------------------------
  const hasActions = partial.actionWriteback.length > 0;
  const actionBlockingGap = hasBlockingGapInLevel(partial.allGaps, "action-writeback");
  const submissionCriteriaDeferred = hasSubmissionCriteriaNeedingHumanReview(partial);

  if (!hasActions || actionBlockingGap || submissionCriteriaDeferred) {
    const firstGap = firstNextQuestion(
      partial.allGaps.filter((g) => g.level === "action-writeback"),
    );
    return {
      readiness: "object-link-clear",
      completedLevels,
      nextQuestion:
        firstGap ??
        (!hasActions
          ? "What actions (writes) should the chatbot be able to perform?"
          : submissionCriteriaDeferred
          ? "Review deferred submission criteria (ObjectQueryResult, GroupMember) with a human reviewer."
          : "Resolve blocking gaps in action / writeback definitions."),
    };
  }

  completedLevels.push("action-writeback");
  if (partial.functions.length > 0 && !hasBlockingGapInLevel(partial.allGaps, "function")) {
    completedLevels.push("function");
  }

  // -------------------------------------------------------------------------
  // Gate 3: action-clear
  // chatbotStudio must have ≥ 1 entry.
  // -------------------------------------------------------------------------
  const hasChatbots = partial.chatbotStudio.length > 0;
  const chatbotBlockingGap = hasBlockingGapInLevel(partial.allGaps, "chatbot-studio");

  if (!hasChatbots || chatbotBlockingGap) {
    const firstGap = firstNextQuestion(
      partial.allGaps.filter((g) => g.level === "chatbot-studio"),
    );
    return {
      readiness: "action-clear",
      completedLevels,
      nextQuestion:
        firstGap ??
        (!hasChatbots
          ? "Define the Chatbot Studio surface(s) for this use case."
          : "Resolve blocking gaps in chatbot studio configuration."),
    };
  }

  completedLevels.push("chatbot-studio");
  if (partial.aiFdeMcpBoundary && !hasBlockingGapInLevel(partial.allGaps, "ai-fde-mcp-boundary")) {
    completedLevels.push("ai-fde-mcp-boundary");
  }
  if (partial.branchRelease && !hasBlockingGapInLevel(partial.allGaps, "branch-release")) {
    completedLevels.push("branch-release");
  }

  // -------------------------------------------------------------------------
  // Gate 4: chatbot-clear
  // evalObservability must be defined.
  // -------------------------------------------------------------------------
  const hasEval = partial.evalObservability != null;
  const evalBlockingGap = hasBlockingGapInLevel(partial.allGaps, "eval-observability");

  if (!hasEval || evalBlockingGap) {
    const firstGap = firstNextQuestion(
      partial.allGaps.filter((g) => g.level === "eval-observability"),
    );
    return {
      readiness: "chatbot-clear",
      completedLevels,
      nextQuestion:
        firstGap ??
        (!hasEval
          ? "Define an AIP Evals suite for this chatbot surface."
          : "Resolve blocking gaps in the eval observability review."),
    };
  }

  completedLevels.push("eval-observability");

  // -------------------------------------------------------------------------
  // Gate 5: eval-clear → ready-for-semantic-approval
  // All above + hasApprovedSIC.
  // -------------------------------------------------------------------------
  if (!hasApprovedSIC) {
    return {
      readiness: "eval-clear",
      completedLevels,
      nextQuestion:
        "All review levels are clear. Submit for semantic approval via mcp__palantir-mini__pm_semantic_intent_gate.",
    };
  }

  return {
    readiness: "ready-for-semantic-approval",
    completedLevels,
    nextQuestion: undefined,
  };
}
