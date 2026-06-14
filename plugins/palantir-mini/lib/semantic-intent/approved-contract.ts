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
//   (b) Q2 user-confirmation HARD GATE — TWO sub-gates:
//       (b1) no empty-fillSequence pass — a nine-axis SIC (one carrying `axes`)
//            with an EMPTY/absent fillSequence is refused OUTRIGHT, independent of
//            gate (a). The 9-axis turn engine is the only producer of a non-empty
//            fillSequence, so this makes the turn engine the SOLE path to a
//            confirmable axis. (Closes D1-3: safety no longer rides on gate (a)'s
//            legacy status check — even a session draft pre-stamped status:'approved'
//            is refused here because its fillSequence is empty.)
//       (b2) per-step source check — every nine-axis fill step that filled or
//            waived an axis must have source==='user'. An axis filled by the AI
//            alone (source 'agent'/'system') is UNCONFIRMED and blocks approval; a
//            'not-applicable' axis counts as confirmed ONLY when its step is
//            user-sourced. (Defense in depth: catches partial agent-fills.)
//
// Refusal returns a typed result (never throws) in the lib's {field,message}
// issue shape, plus the unconfirmed axis labels for a plain-language KO/EN message.
//
// Scope guard: (b1) keys on `axes`-present + empty-fillSequence. A LEGACY SIC
// (no `axes`, approved via the legacy validator regime) has no `axes`, so it is
// unaffected and stays graded by gate (a) + (b2).

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
  // OE-13 — the agentAutoFill scalar seam (a non-axis approval-surface field the AI wrote).
  "agentAutoFill:scalar": "AI 자동채움 스칼라 필드(agentAutoFill) / AI auto-filled scalar fields",
};

/** Map a fill step (by 1-based ordinal) to the axis/intent key it filled. */
function fillStepTargetKey(step: SicFillStep): string | undefined {
  const descriptor = NINE_AXIS_SIC_SEQUENCE.find((turn) => turn.step === step.step);
  if (descriptor === undefined) return undefined;
  return descriptor.targetAxis ?? (descriptor.turnIndex === 0 ? "rawIntent" : undefined);
}

/**
 * Q2 sub-gate (b1) helper: the axis keys that carry an unconfirmed proposal
 * (status 'draft') or remain 'open' on a nine-axis SIC. Surfaced as the
 * `unconfirmedAxes` payload when a nine-axis SIC has NO user-confirmed fill steps.
 */
function draftOrOpenAxisKeys(contract: SemanticIntentContract): string[] {
  const axes = (contract as { readonly axes?: Record<string, { readonly status?: string }> }).axes;
  if (axes === undefined) return [];
  return Object.keys(axes).filter((key) => {
    const status = axes[key]?.status;
    return status === "draft" || status === "open";
  });
}

/**
 * OE-13 — synthetic key surfaced when a non-user fill step does NOT map to a
 * recognized axis/intent key (the `agentAutoFill` scalar seam, audit D4-7 / OP-5).
 * The 9-axis turn engine's `agentAutoFill` arg spreads ARBITRARY scalar
 * `SemanticIntentContract` fields onto the contract while recording the step
 * `source:"agent"`; those fields feed the approval surface yet previously slipped
 * past the axis-scoped Q2 gate (a step whose descriptor has no `targetAxis` and
 * is not T0 returned `undefined` and was SKIPPED). Surfacing this marker makes the
 * gate WHOLE-CONTRACT-scoped: any AI-sourced fill step is unconfirmed, mapped or not.
 */
const AGENT_AUTOFILL_SCALAR_KEY = "agentAutoFill:scalar";

/**
 * Q2 hard gate: collect the axis keys whose nine-axis fill step was filled by the
 * AI alone (source !== 'user'). Empty ⇒ every recorded axis answer is user-confirmed.
 *
 * OE-13 — whole-contract-scoped: a non-user step that DOES map to a known axis/intent
 * key surfaces that key (unchanged); one that does NOT map (the `agentAutoFill` scalar
 * seam) surfaces `AGENT_AUTOFILL_SCALAR_KEY`, so an AI-written approval-surface scalar
 * can no longer ride past the gate just because its step targets no recognized axis.
 */
function unconfirmedAxisKeys(contract: SemanticIntentContract): string[] {
  const fillSequence = (contract as SicWithFillFields).fillSequence ?? [];
  const unconfirmed: string[] = [];
  for (const stepRecord of fillSequence) {
    if (stepRecord.source === "user") continue;
    const key = fillStepTargetKey(stepRecord) ?? AGENT_AUTOFILL_SCALAR_KEY;
    if (!unconfirmed.includes(key)) unconfirmed.push(key);
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

  // (b1) Q2 HARD GATE — no empty-fillSequence pass on a nine-axis SIC.
  // Runs BEFORE gate (a) and INDEPENDENT of it: a contract carrying `axes` (the
  // nine-axis shape) MUST also carry user fill steps; an empty/absent fillSequence
  // means NO per-axis user confirmation happened. Refused outright with the precise
  // `fillSequence` reason — so safety no longer rides on gate (a)'s legacy status
  // check. Even a session draft force-stamped status:'approved' (which WOULD pass
  // the legacy validator in gate (a)) is refused here (D1-3 closure). Legacy
  // (no-`axes`) SICs have no `axes`, so this gate is skipped for them.
  const hasAxes =
    (contract as { readonly axes?: unknown }).axes !== undefined;
  const fillSequence = (contract as SicWithFillFields).fillSequence ?? [];
  if (hasAxes && fillSequence.length === 0) {
    const draftOrOpen = draftOrOpenAxisKeys(contract);
    return {
      ok: false,
      reason:
        "9축 SIC는 사용자 확인(턴별 fillSequence)이 없으면 승인할 수 없습니다. " +
        "A nine-axis SIC cannot be approved without per-axis user confirmation (an empty fillSequence). " +
        "9축 턴 엔진을 실행해 각 축을 확인하세요 / Run the 9-axis turn engine to confirm each axis.",
      issues: [
        {
          field: "fillSequence",
          message: "nine-axis SIC has no user-confirmed fill steps (empty fillSequence)",
        },
      ],
      unconfirmedAxes: draftOrOpen,
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

  // (b2) Q2 HARD GATE — every recorded axis answer must be user-confirmed.
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
