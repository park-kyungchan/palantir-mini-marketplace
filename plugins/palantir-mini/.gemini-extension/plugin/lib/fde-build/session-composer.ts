/**
 * palantir-mini lib/fde-build/session-composer.ts
 *
 * Main composer: aggregates 9 builder outputs into a complete
 * FDEOntologyBuildSession. Pure function — no I/O, no side effects.
 *
 * HARD READ-ONLY INVARIANT: mutationAuthorized is always literal `false`.
 * The composer never produces commitToken, applyToken, approvalToken, or
 * authorizeMutation. Mutation authority remains with SemanticIntentContract
 * + DigitalTwinChangeContract (lib/lead-intent/contracts.ts).
 *
 * Caller is responsible for:
 *   1. Fetching OntologyContextQueryResult via mcp__palantir-mini__ontology_context_query
 *   2. Passing the result + optional SIC/DTC/SemanticConversationState here
 *   3. Presenting the returned FDEOntologyBuildSession to the user in plain language
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 1.B
 */

import type {
  FDEOntologyBuildSession,
  FDEReadinessVerdict,
  FDEReviewLevelGap,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import {
  FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import {
  buildMissionDecision,
  buildObjectTypeReviews,
  buildLinkTypeReviews,
  buildActionWritebackReviews,
  buildFunctionReviews,
  buildChatbotStudioReviews,
  buildAIFDEMcpBoundaryReview,
  buildBranchReleaseReview,
  buildEvalObservabilityReview,
  type LevelBuilderInput,
} from "./level-builders";
import { evaluateReadiness } from "./readiness-evaluator";
import { adaptFDEContextToLevelBuilderInput } from "./context-adapter";

// =============================================================================
// Input contract
// =============================================================================

export interface ComposeFDEOntologyBuildSessionInput {
  /** Absolute path or slug of the project being reviewed. */
  readonly project: string;
  /** OntologyContextQueryResult from mcp__palantir-mini__ontology_context_query. */
  readonly ontologyContext?: unknown;
  /** Current FDEOntologyEngineeringSession or session projection to adapt into builder input. */
  readonly fdeOntologyEngineeringSession?: unknown;
  /** Approved SemanticIntentContract (optional; signals SIC approval status). */
  readonly semanticIntentContract?: unknown;
  /** Approved DigitalTwinChangeContract (optional). */
  readonly digitalTwinChangeContract?: unknown;
  /** SemanticConversationState (optional; enriches mission + user intent extraction). */
  readonly semanticConversationState?: unknown;
  /** Override ISO8601 timestamp (useful for deterministic tests). Defaults to new Date().toISOString(). */
  readonly nowIso?: string;
}

// =============================================================================
// Plain-language status messages per readiness verdict
// =============================================================================

const PLAIN_LANGUAGE_STATUS: Record<FDEReadinessVerdict, string> = {
  "not-ready":
    "지금은 operational decision이 명확하지 않습니다. mission/decision 단계부터 시작합니다.",
  "mission-clear":
    "Mission is defined. Next: map the core object types and link types for this use case.",
  "object-link-clear":
    "Object and link types are defined. Next: specify the actions (writebacks) users will perform.",
  "action-clear":
    "Actions are defined. Next: configure the Chatbot Studio surface(s) for this use case.",
  "chatbot-clear":
    "Chatbot Studio is configured. Next: add AIP Evals coverage and observability.",
  "eval-clear":
    "All 9 review levels are clear. This session is ready to submit for semantic approval.",
  "ready-for-semantic-approval":
    "Semantic approval is in place. The ontology build is ready for the next governance step.",
};

// =============================================================================
// Gap severity ranking (for topGaps sort)
// =============================================================================

const SEVERITY_RANK: Record<FDEReviewLevelGap["severity"], number> = {
  blocking: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// =============================================================================
// Session RID derivation
// =============================================================================

function deriveSessionRid(project: string, composedAt: string): string {
  // Use project basename to keep the RID readable and deterministic.
  const basename = project.replace(/\/+$/, "").split("/").at(-1) ?? "unknown";
  return `fde-session:${basename}:${composedAt}`;
}

// =============================================================================
// SIC approval detection
// =============================================================================

function detectApprovedSIC(input: ComposeFDEOntologyBuildSessionInput): boolean {
  // An approved SIC is detected when semanticIntentContract carries a non-empty
  // semanticIntentContractRef — the presence of this ref implies the SIC was
  // bound upstream (Lead + harness negotiation step). Without it, no approval.
  const sic = input.semanticIntentContract as Record<string, unknown> | undefined;
  if (sic == null) return false;
  const ref = sic["semanticIntentContractRef"];
  return typeof ref === "string" && ref.trim().length > 0;
}

// =============================================================================
// Main composer
// =============================================================================

/**
 * Compose a read-only FDEOntologyBuildSession from available inputs.
 *
 * This is the primary entry point for the `pm-fde-session-preview` skill and
 * any caller that needs a structured readiness picture without mutation access.
 *
 * @returns FDEOntologyBuildSession — always has mutationAuthorized: false
 */
export function composeFDEOntologyBuildSession(
  input: ComposeFDEOntologyBuildSessionInput,
): FDEOntologyBuildSession {
  const composedAt = input.nowIso ?? new Date().toISOString();
  const sessionRid = deriveSessionRid(input.project, composedAt);

  // Build per-level builder input bag.
  const builderInput: LevelBuilderInput = adaptFDEContextToLevelBuilderInput({
    ontologyContext: input.ontologyContext,
    fdeOntologyEngineeringSession: input.fdeOntologyEngineeringSession,
    semanticIntentContract: input.semanticIntentContract,
    digitalTwinChangeContract: input.digitalTwinChangeContract,
    semanticConversationState: input.semanticConversationState,
    nowIso: composedAt,
    stableSeed: sessionRid,
  });

  // --- Level builds (9 pure calls) ---
  const missionDecision = buildMissionDecision(builderInput);
  const objectTypes = buildObjectTypeReviews(builderInput);
  const linkTypes = buildLinkTypeReviews(builderInput);
  const actionWriteback = buildActionWritebackReviews(builderInput);
  const functions = buildFunctionReviews(builderInput);
  const chatbotStudio = buildChatbotStudioReviews(builderInput);
  const aiFdeMcpBoundary = buildAIFDEMcpBoundaryReview(builderInput);
  const branchRelease = buildBranchReleaseReview(builderInput);
  const evalObservability = buildEvalObservabilityReview(builderInput);

  // --- Aggregate all gaps ---
  const allGaps: FDEReviewLevelGap[] = [
    ...(missionDecision.unresolvedGaps ?? []),
    ...objectTypes.flatMap((o) => o.gaps ?? []),
    ...linkTypes.flatMap((l) => l.gaps ?? []),
    ...actionWriteback.flatMap((a) => a.gaps ?? []),
    ...functions.flatMap((f) => f.gaps ?? []),
    ...chatbotStudio.flatMap((c) => c.gaps ?? []),
    ...(aiFdeMcpBoundary?.gaps ?? []),
    ...(branchRelease?.gaps ?? []),
    ...(evalObservability?.gaps ?? []),
  ];

  // Sort by severity (blocking first) then by level order.
  const sortedGaps = [...allGaps].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  // Top-priority shortlist (≤ 5).
  const topGaps = sortedGaps.slice(0, 5);

  // --- Evaluate readiness ---
  const hasApprovedSIC = detectApprovedSIC(input);

  const { readiness, completedLevels, nextQuestion } = evaluateReadiness(
    {
      missionDecision,
      objectTypes,
      linkTypes,
      actionWriteback,
      functions,
      chatbotStudio,
      aiFdeMcpBoundary,
      branchRelease,
      evalObservability,
      allGaps: sortedGaps,
    },
    hasApprovedSIC,
  );

  // --- Derive read-only flags ---
  const requiresDigitalTwinChangeContract =
    readiness === "ready-for-semantic-approval" && hasApprovedSIC;

  // readOnly = true unless both conditions hold: SIC approved + ready-for-semantic-approval.
  // Even then, mutationAuthorized remains false — read-only status is advisory.
  const readOnly = !requiresDigitalTwinChangeContract;

  const plainLanguageStatus = PLAIN_LANGUAGE_STATUS[readiness];

  // --- Return composed session ---
  // INVARIANT: mutationAuthorized is a literal `false` — never assigned conditionally.
  return {
    schemaVersion: FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION,
    sessionRid,
    project: input.project,
    composedAt,
    mutationAuthorized: false,
    readOnly,
    readiness,
    requiresDigitalTwinChangeContract,
    semanticIntentContractRef:
      hasApprovedSIC
        ? String((input.semanticIntentContract as Record<string, unknown>)["semanticIntentContractRef"])
        : undefined,
    digitalTwinChangeContractRef:
      input.digitalTwinChangeContract != null
        ? String((input.digitalTwinChangeContract as Record<string, unknown>)["digitalTwinChangeContractRef"] ?? "")
        : undefined,
    plainLanguageStatus,
    missionDecision,
    objectTypes,
    linkTypes,
    actionWriteback,
    functions,
    chatbotStudio,
    aiFdeMcpBoundary,
    branchRelease,
    evalObservability,
    completedLevels,
    topGaps,
    allGaps: sortedGaps,
    nextQuestion,
  };
}
