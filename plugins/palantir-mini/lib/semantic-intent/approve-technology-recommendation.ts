import type { TechnologyRecommendation } from "../context-engineering/context-plan-builder";
import type { ApprovalRef } from "../lead-intent/contracts";
import type { TurnCardDecisionSpec } from "../lead-intent/contracts";
import {
  createUserApprovalRef,
  type StructuredApprovalRef,
} from "../prompt-front-door/approval-ref";
import type { PromptRuntime } from "../prompt-front-door/envelope";

// ─── technologyRecommendation USER-APPROVAL write-path (Q3) ───────────────────
//
// Mirrors the SHAPE of approveSemanticIntentContract (approved-contract.ts):
// a pure function that mints a structured approvalRef on an input recommendation
// — or refuses with a typed result — and NEVER throws (caller-recoverable).
//
// The TechnologyRecommendation type (context-engineering/context-plan-builder.ts)
// is NOT primitive-backed and NOT re-exported from runtime-overlay/schemas-snapshot,
// so it carries no approvalRef slot. Rather than widen the build-side type, this
// module models the approved recommendation as the input rec + an attached
// approvalRef on a lib-side wrapper type. The build-side rec is untouched.
//
// Q3 (HANDOFF, LOCKED): the technology recommendation is USER-APPROVED. This is the
// single user-confirmation gate; the validationPlan is auto-derived from SUCCESS-EVAL
// and shown WITHOUT its own approval (Slice C), so it is not gated here.

/**
 * The approved technology recommendation: the input recommendation plus the minted
 * structured approvalRef. A lib-side wrapper — the build-side TechnologyRecommendation
 * stays free of an approval slot (it is not primitive-backed; widening it would leak an
 * approval concern into the plan builder).
 */
export type ApprovedTechnologyRecommendation = TechnologyRecommendation & {
  readonly approvalRef: ApprovalRef;
};

export function isApprovedTechnologyRecommendation(
  rec: TechnologyRecommendation | undefined,
): rec is ApprovedTechnologyRecommendation {
  return Boolean(
    rec &&
      typeof rec.recommendationId === "string" &&
      rec.recommendationId.trim().length > 0 &&
      hasApprovalRefOn(rec),
  );
}

function hasApprovalRefOn(
  rec: TechnologyRecommendation,
): rec is ApprovedTechnologyRecommendation {
  const ref = (rec as ApprovedTechnologyRecommendation).approvalRef;
  if (typeof ref === "string") return ref.trim().length > 0;
  return typeof ref === "object" && ref !== null;
}

export interface ApproveTechnologyRecommendationInput {
  /** Runtime identity recording the approval (resolveHostRuntimeIdentity); never a literal name. */
  readonly approverIdentity: string;
  /** ISO8601 capture time; defaults to now. */
  readonly capturedAt?: string;
  /** Optional plain-language note the user attached to the approval. */
  readonly note?: string;
}

export interface ApproveTechnologyRecommendationIssue {
  readonly field: string;
  readonly message: string;
}

export type ApproveTechnologyRecommendationResult =
  | { readonly ok: true; readonly recommendation: ApprovedTechnologyRecommendation }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly issues: readonly ApproveTechnologyRecommendationIssue[];
    };

/** Map a host runtime identity to the prompt-front-door PromptRuntime (env-driven, never literal). */
function approvalRuntime(identity: string): PromptRuntime {
  switch (identity) {
    case "claude-code":
      return "claude";
    case "codex":
      return "codex";
    case "gemini":
      return "gemini";
    case "cursor":
      return "cursor";
    default:
      return "unknown";
  }
}

/**
 * Approve a proposed TechnologyRecommendation — mint a structured approvalRef and
 * attach it to the recommendation — or refuse with a typed result. Pure: never
 * mutates the input, never throws (caller-recoverable). Refuses only when the rec
 * lacks a usable recommendationId (the identity the approvalRef binds to).
 */
export function approveTechnologyRecommendation(
  recommendation: TechnologyRecommendation,
  input: ApproveTechnologyRecommendationInput,
): ApproveTechnologyRecommendationResult {
  const recommendationId = recommendation.recommendationId?.trim();
  if (recommendationId === undefined || recommendationId.length === 0) {
    return {
      ok: false,
      reason:
        "기술 추천을 승인하려면 recommendationId가 필요합니다. " +
        "recommendationId is required to approve a TechnologyRecommendation.",
      issues: [{ field: "recommendationId", message: "recommendationId is required" }],
    };
  }

  const userVisibleSummary =
    `${recommendation.policy}: ${recommendation.rationale}`.trim() || recommendationId;
  const approvalRef: StructuredApprovalRef = createUserApprovalRef({
    promptId: recommendationId,
    promptHash: recommendationId,
    sessionId: recommendationId,
    runtime: approvalRuntime(input.approverIdentity),
    userVisibleSummary,
    userAnswer: input.note?.trim() || userVisibleSummary,
    approvalSurface: "technology-recommendation",
    approvedAt: input.capturedAt,
  });

  return {
    ok: true,
    recommendation: { ...recommendation, approvalRef },
  };
}

// ─── non-developer approval card (mirrors nineAxisTurnCard's spec SHAPE) ──────
//
// Emits the SAME TurnCardDecisionSpec structure the nine-axis card emits, but for
// a single technology decision (not axis-indexed). A recommended 'confirm-draft'
// choice carries the proposed recommendation rationale as the draft the user
// confirms; an 'answer' choice lets the user correct it. Bilingual KO / EN.

export interface BuildTechnologyApprovalCardOptions {
  /** Korean one-line note clarifying the proposal (rendered alongside the rationale). */
  readonly proposalNoteKo?: string;
  /** English mirror of `proposalNoteKo`. */
  readonly proposalNoteEn?: string;
}

/** Render the optional bilingual proposal note as a trailing fragment, or "" when absent. */
function proposalNote(opts?: BuildTechnologyApprovalCardOptions): string {
  const ko = opts?.proposalNoteKo ?? "";
  const en = opts?.proposalNoteEn ?? "";
  if (!ko && !en) return "";
  return ` (제안 이유 / Why proposed: ${ko}${ko && en ? " / " : ""}${en})`;
}

/**
 * Build the non-developer approval card for a proposed TechnologyRecommendation.
 * The 'confirm-draft' choice (recommended) confirms the proposal as the user's own
 * approval; 'answer' lets the user correct it. Mirrors nineAxisTurnCard's spec shape
 * (does NOT call it — that builder is axis-indexed). Bilingual KO / EN.
 */
export function buildTechnologyApprovalCard(
  recommendation: TechnologyRecommendation,
  opts?: BuildTechnologyApprovalCardOptions,
): TurnCardDecisionSpec {
  const recommendationId = recommendation.recommendationId?.trim() || "technology";
  const draftText = `${recommendation.policy} — ${recommendation.rationale}`;

  const confirmDraftChoice = {
    choiceId: "confirm-draft",
    label: "제안 확정 / Confirm proposal",
    consequence:
      `이 기술 추천을 당신의 승인으로 기록: "${draftText}" / records this technology recommendation as YOUR approval` +
      proposalNote(opts),
    recommended: true,
  };

  const answerChoice = {
    choiceId: "answer",
    label: "직접 입력 / Enter",
    consequence:
      "기술 추천을 직접 고쳐서 기록 / records your own correction to the technology recommendation",
    recommended: false,
  };

  return {
    decisionId: `technology-recommendation:${recommendationId}`,
    phase: "TECHNOLOGY",
    plainKoreanTitle: "이 기술 추천을 승인하시겠습니까?",
    plainKoreanSummary: "Approve this technology recommendation?",
    whyItMatters:
      "기술 선택(백엔드·미러 경계)은 이후 모든 구현 경계를 정합니다 — 승인이 있어야 DTC가 그 경계 안에서만 만들어집니다. / " +
      "The technology choice (backend, mirror boundary) sets every downstream implementation boundary — your approval keeps the DTC inside it.",
    recommendedChoiceId: "confirm-draft",
    choices: [confirmDraftChoice, answerChoice],
    evidenceRefs: [],
    blocking: false,
    freeTextAllowed: true,
  };
}
