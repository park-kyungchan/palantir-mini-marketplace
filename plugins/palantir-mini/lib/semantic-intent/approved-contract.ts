import {
  hasApprovalRef,
  type ApprovalRef,
  type SemanticIntentContract,
} from "../lead-intent/contracts";
import { validateSemanticIntentContract } from "../lead-intent/contracts";
import {
  createUserApprovalRef,
  type StructuredApprovalRef,
} from "../prompt-front-door/approval-ref";
import type { PromptRuntime } from "../prompt-front-door/envelope";
import {
  isNineAxisSicComplete,
  NINE_AXIS_SIC_SEQUENCE,
} from "./nine-axis-sic-fill-sequence";
import type { SicFillStep } from "./sic-fill-types";
import type { SicWithFillFields } from "./sic-fill-types";

export type ApprovedSemanticIntentContract = SemanticIntentContract & {
  readonly status: "approved";
  readonly approvalRef: ApprovalRef;
  readonly contractId: string;
};

export function isApprovedSemanticIntentContract(
  contract: SemanticIntentContract | undefined,
): contract is ApprovedSemanticIntentContract {
  return Boolean(
    contract &&
      contract.status === "approved" &&
      typeof contract.contractId === "string" &&
      contract.contractId.trim().length > 0 &&
      hasApprovalRef(contract.approvalRef),
  );
}

export function semanticIntentContractRefFromApproved(
  contract: SemanticIntentContract,
): string {
  if (!isApprovedSemanticIntentContract(contract)) {
    throw new Error(
      "semanticIntentContractRef requires an approved SemanticIntentContract with contractId and approvalRef.",
    );
  }
  return contract.contractId;
}

// ─── SIC approval write-path (Q2 hard gate) ──────────────────────────────────
//
// Mints status:'approved' + a structured approvalRef on a draft SIC, but ONLY
// when BOTH gates pass:
//   (a) completeness — at least ONE of the two regimes holds: the nine-axis fill
//       is complete (isNineAxisSicComplete) OR the legacy validator passes
//       (validateSemanticIntentContract). A nine-axis SIC and a legacy SIC are
//       graded by their own regime; requiring only one keeps both paths minting.
//   (b) Q2 user-confirmation HARD GATE — every nine-axis fill step that filled or
//       waived an axis must have source==='user'. An axis filled by the AI alone
//       (source 'agent'/'system') is UNCONFIRMED and blocks approval; a
//       'not-applicable' axis counts as confirmed ONLY when its step is user-sourced.
//
// Refusal returns a typed result (never throws) in the lib's {field,message}
// issue shape, plus the unconfirmed axis labels for a plain-language KO/EN message.

export interface ApproveSemanticIntentContractInput {
  /** Runtime identity recording the approval (resolveHostRuntimeIdentity); never a literal name. */
  readonly approverIdentity: string;
  /** ISO8601 capture time; defaults to now. */
  readonly capturedAt?: string;
  /** Optional plain-language note the user attached to the approval. */
  readonly note?: string;
}

export interface ApproveSemanticIntentContractIssue {
  readonly field: string;
  readonly message: string;
}

export type ApproveSemanticIntentContractResult =
  | { readonly ok: true; readonly contract: ApprovedSemanticIntentContract }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly issues: readonly ApproveSemanticIntentContractIssue[];
      /** Axis keys whose fill step was not user-confirmed (Q2 gate). */
      readonly unconfirmedAxes: readonly string[];
    };

/** Bilingual axis labels for the Q2 plain-language refusal message. */
const AXIS_LABELS_KO_EN: Record<string, string> = {
  rawIntent: "의도(INTENT) / intent",
  data: "데이터(DATA) / data",
  logic: "로직(LOGIC) / logic",
  action: "액션(ACTION) / action",
  governance: "거버넌스(GOVERNANCE) / governance",
  context: "맥락(CONTEXT) / context",
  successEval: "성공기준(SUCCESS-EVAL) / success-eval",
  constraintsNonGoals: "제약·비목표(CONSTRAINTS-NONGOALS) / constraints-non-goals",
  actors: "행위자(ACTORS) / actors",
  memoryPrior: "선례기억(MEMORY-PRIOR) / memory-prior",
};

/** Map a fill step (by 1-based ordinal) to the axis/intent key it filled. */
function fillStepTargetKey(step: SicFillStep): string | undefined {
  const descriptor = NINE_AXIS_SIC_SEQUENCE.find((turn) => turn.step === step.step);
  if (descriptor === undefined) return undefined;
  return descriptor.targetAxis ?? (descriptor.turnIndex === 0 ? "rawIntent" : undefined);
}

/**
 * Q2 hard gate: collect the axis keys whose nine-axis fill step was filled by the
 * AI alone (source !== 'user'). Empty ⇒ every recorded axis answer is user-confirmed.
 */
function unconfirmedAxisKeys(contract: SemanticIntentContract): string[] {
  const fillSequence = (contract as SicWithFillFields).fillSequence ?? [];
  const unconfirmed: string[] = [];
  for (const stepRecord of fillSequence) {
    if (stepRecord.source === "user") continue;
    const key = fillStepTargetKey(stepRecord);
    if (key !== undefined && !unconfirmed.includes(key)) unconfirmed.push(key);
  }
  return unconfirmed;
}

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
 * Approve a draft SemanticIntentContract — mint status:'approved' + a structured
 * approvalRef — or refuse with a typed result. Pure: never mutates the input,
 * never throws (caller-recoverable). See the §SIC approval write-path note above
 * for the completeness + Q2 user-confirmation gates.
 */
export function approveSemanticIntentContract(
  contract: SemanticIntentContract,
  input: ApproveSemanticIntentContractInput,
): ApproveSemanticIntentContractResult {
  const contractId = contract.contractId?.trim();
  if (contractId === undefined || contractId.length === 0) {
    return {
      ok: false,
      reason: "contractId is required to approve a SemanticIntentContract.",
      issues: [{ field: "contractId", message: "contractId is required" }],
      unconfirmedAxes: [],
    };
  }

  // (a) completeness — at least one of the two regimes must pass.
  const nineAxisComplete = isNineAxisSicComplete(contract);
  const legacyResult = validateSemanticIntentContract(contract);
  if (!nineAxisComplete && !legacyResult.valid) {
    const issues = legacyResult.issues.map((issue) => ({
      field: issue.field,
      message: issue.message,
    }));
    return {
      ok: false,
      reason:
        "SemanticIntentContract is incomplete: neither the nine-axis fill nor the legacy validator passed. " +
        "아직 9축 채우기와 기존 검증을 모두 통과하지 못했습니다.",
      issues,
      unconfirmedAxes: [],
    };
  }

  // (b) Q2 HARD GATE — every recorded axis answer must be user-confirmed.
  const unconfirmedAxes = unconfirmedAxisKeys(contract);
  if (unconfirmedAxes.length > 0) {
    const labels = unconfirmedAxes
      .map((key) => AXIS_LABELS_KO_EN[key] ?? key)
      .join(", ");
    return {
      ok: false,
      reason:
        `다음 축의 답변은 AI가 단독으로 채운 것이라 사용자 확인이 필요합니다: ${labels}. ` +
        `These answers were filled by the AI alone and need your confirmation: ${labels}.`,
      issues: unconfirmedAxes.map((key) => ({
        field: `axes.${key}`,
        message: "axis answer was not user-confirmed (source !== 'user')",
      })),
      unconfirmedAxes,
    };
  }

  // Both gates passed — mint the approval.
  const userVisibleSummary = contract.confirmedIntent?.trim() || contract.rawIntent || contractId;
  const approvalRef: StructuredApprovalRef = createUserApprovalRef({
    promptId: contractId,
    promptHash: contractId,
    sessionId: contractId,
    runtime: approvalRuntime(input.approverIdentity),
    userVisibleSummary,
    userAnswer: input.note?.trim() || userVisibleSummary,
    approvalSurface: "semantic-intent",
    approvedAt: input.capturedAt,
  });

  const approved: ApprovedSemanticIntentContract = {
    ...contract,
    contractId,
    status: "approved",
    approvalRef,
  };
  return { ok: true, contract: approved };
}
