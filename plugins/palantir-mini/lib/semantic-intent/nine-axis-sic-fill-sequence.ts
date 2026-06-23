// palantir-mini — 9-axis SemanticIntentContract fill sequence (understand-phase heart).
//
// Runtime-neutral, non-developer-friendly turn-by-turn elicitation that surfaces
// the user's explicit AND implicit intent into the 9 axes (DATA/LOGIC/ACTION/
// GOVERNANCE + CONTEXT/SUCCESS-EVAL/CONSTRAINTS-NONGOALS/ACTORS/MEMORY-PRIOR),
// producing a reviewable SemanticIntentContract.axes.
//
// Additive: registered as fill policy "nine-axis-sic" in fill-policy.ts. Existing
// sequences (default-8-turn, context-engineering-to-sic, dtc-turn-fill,
// fde-ontology-build) are unchanged. Bilingual descriptors (KO default + EN mirror).

import type { SemanticIntentContract } from "../lead-intent/contracts";
import type {
  SemanticIntentAxes,
  SicAxis,
  SicAxisKey,
} from "#schemas/ontology/primitives/semantic-intent-contract";
import type {
  SicFillSource,
  SicFillStep,
  SicTurnDescriptor,
  SicWithFillFields,
} from "./sic-fill-types";

export const NINE_AXIS_SIC_POLICY = "nine-axis-sic" as const;

/** A 9-axis turn descriptor — extends SicTurnDescriptor with a bilingual mirror + axis target. */
export interface NineAxisTurnDescriptor extends SicTurnDescriptor {
  /** English mirror of `question` (bilingual at descriptor level). */
  readonly questionEn: string;
  /** Which of the 9 axes this turn fills; undefined for T0 (intent). */
  readonly targetAxis?: SicAxisKey;
  /**
   * Generic worked example (KO) — 1-2 plain sentences showing what a good answer
   * looks like, in an everyday non-dev scenario (a small community library).
   * Illustrative only; never copied into the contract.
   */
  readonly exampleKo?: string;
  /** English mirror of `exampleKo`. */
  readonly exampleEn?: string;
}

export type NineAxisSicContract = SicWithFillFields & {
  readonly fillPolicy?: typeof NINE_AXIS_SIC_POLICY;
  readonly axes?: SemanticIntentAxes;
};

const AXIS_KEYS: readonly SicAxisKey[] = [
  "data",
  "logic",
  "action",
  "governance",
  "context",
  "successEval",
  "constraintsNonGoals",
  "actors",
  "memoryPrior",
] as const;

/** T0 intent + one turn per axis (10 turns). KO question is default; EN mirrors. */
export const NINE_AXIS_SIC_SEQUENCE: readonly NineAxisTurnDescriptor[] = [
  {
    turnIndex: 0,
    step: 1,
    targetField: "rawIntent",
    question: "한 문장으로, 무엇을 하려는 건가요? 그리고 절대 건드리면 안 되는 게 있나요?",
    questionEn: "In one sentence, what are you trying to do — and is there anything that must NOT be touched?",
    exampleKo: "예) \"동네 도서관에서 회원이 책을 빌리고 반납하는 흐름을 만들고 싶다. 단, 다른 회원의 개인정보는 절대 건드리지 않는다.\"",
    exampleEn: "e.g. \"I want a flow where library members borrow and return books — but other members' personal data must never be touched.\"",
  },
  {
    turnIndex: 1,
    step: 2,
    targetField: "axes.data",
    targetAxis: "data",
    question: "이 일이 다루는 정보나 대상(객체)은 무엇인가요?",
    questionEn: "What information or objects does this touch?",
    exampleKo: "예) \"회원, 책, 대출기록 세 가지를 다룬다. 책에는 제목·바코드·상태가 있다.\"",
    exampleEn: "e.g. \"Three objects: member, book, loan record. A book has a title, barcode, and status.\"",
  },
  {
    turnIndex: 2,
    step: 3,
    targetField: "axes.logic",
    targetAxis: "logic",
    question: "어떤 규칙·계산·판단이 적용되나요?",
    questionEn: "What rule, computation, or decision applies?",
    exampleKo: "예) \"한 회원은 최대 5권까지, 대출기간은 14일. 연체 중이면 새 대출을 막는다.\"",
    exampleEn: "e.g. \"A member may borrow up to 5 books for 14 days; an overdue member is blocked from new loans.\"",
  },
  {
    turnIndex: 3,
    step: 4,
    targetField: "axes.action",
    targetAxis: "action",
    question: "무엇이 실제로 바뀌거나 실행되나요?",
    questionEn: "What change or execution actually happens?",
    exampleKo: "예) \"대출하면 책 상태가 '대출중'으로 바뀌고 반납예정일이 기록된다. 반납하면 '비치중'으로 되돌아간다.\"",
    exampleEn: "e.g. \"Borrowing flips the book's status to 'on loan' and records a due date; returning flips it back to 'available'.\"",
  },
  {
    turnIndex: 4,
    step: 5,
    targetField: "axes.governance",
    targetAxis: "governance",
    question: "누가 해도 되나요? 무엇이 안전하고, 무엇이 승인을 필요로 하나요?",
    questionEn: "Who may do it? What is safe, and what needs approval?",
    exampleKo: "예) \"대출·반납은 사서면 누구나 가능. 단, 연체료 면제는 관리자 승인을 받아야 한다.\"",
    exampleEn: "e.g. \"Any librarian may check books in or out; waiving a late fee needs manager approval.\"",
  },
  {
    turnIndex: 5,
    step: 6,
    targetField: "axes.context",
    targetAxis: "context",
    question: "어떤 자료·문서·출처를 근거로 써야 하나요?",
    questionEn: "What data, documents, or sources should it rely on?",
    exampleKo: "예) \"도서 목록은 기존 장서 대장 스프레드시트를, 대출 규칙은 도서관 이용 안내문을 근거로 쓴다.\"",
    exampleEn: "e.g. \"Use the existing catalog spreadsheet for the book list and the library's policy sheet for the loan rules.\"",
  },
  {
    turnIndex: 6,
    step: 7,
    targetField: "axes.successEval",
    targetAxis: "successEval",
    question: "'다 됐다' 또는 '맞다'는 것을 무엇으로 판단하나요?",
    questionEn: "How do we judge that it is done or correct?",
    exampleKo: "예) \"한 회원이 책을 빌리고 반납했을 때 재고 수와 대출기록이 정확히 맞으면 성공으로 본다.\"",
    exampleEn: "e.g. \"Success = after one member borrows and returns a book, the stock count and loan record match exactly.\"",
  },
  {
    turnIndex: 7,
    step: 8,
    targetField: "axes.constraintsNonGoals",
    targetAxis: "constraintsNonGoals",
    question: "무엇이 일어나면 안 되나요? 건드리면 안 되는 범위는 어디까지인가요?",
    questionEn: "What must NOT happen, and what is out of bounds?",
    exampleKo: "예) \"같은 책이 동시에 두 사람에게 대출되면 안 된다. 회원 연락처를 외부로 내보내는 일은 범위 밖이다.\"",
    exampleEn: "e.g. \"The same book must never be on loan to two people at once; exporting member contact details is out of bounds.\"",
  },
  {
    turnIndex: 8,
    step: 9,
    targetField: "axes.actors",
    targetAxis: "actors",
    question: "누가 실행하고, 누구의 권한이 필요한가요?",
    questionEn: "Who runs it, and whose authority is needed?",
    exampleKo: "예) \"실제 대출·반납은 창구 사서가 실행하고, 장서 폐기는 도서관장 권한이 필요하다.\"",
    exampleEn: "e.g. \"The front-desk librarian runs check-out/return; discarding a book from the collection needs the head librarian's authority.\"",
  },
  {
    turnIndex: 9,
    step: 10,
    targetField: "axes.memoryPrior",
    targetAxis: "memoryPrior",
    question: "재사용할 만한, 과거의 비슷한 결정이 있나요?",
    questionEn: "Is there a prior, similar decision worth reusing?",
    exampleKo: "예) \"작년에 만든 DVD 대여 규칙(대출기간·연체 처리)을 거의 그대로 책에 다시 쓸 수 있다.\"",
    exampleEn: "e.g. \"Last year's DVD-lending rules (loan period, overdue handling) can be reused almost as-is for books.\"",
  },
] as const;

function emptyAxis(): SicAxis {
  return { summary: "", refs: [], status: "open" };
}

function emptyAxes(): SemanticIntentAxes {
  return {
    data: emptyAxis(),
    logic: emptyAxis(),
    action: emptyAxis(),
    governance: emptyAxis(),
    context: emptyAxis(),
    successEval: emptyAxis(),
    constraintsNonGoals: emptyAxis(),
    actors: emptyAxis(),
    memoryPrior: emptyAxis(),
  };
}

function csv(input: string): string[] {
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Refs = tokens that look like paths/rids (contain "/", "." or ":"). */
function extractRefs(values: readonly string[]): string[] {
  return values.filter((v) => v.includes("/") || v.includes(".") || v.includes(":"));
}

/**
 * Build the SicAxis a user-sourced `userInput` answer produces for one axis.
 * SINGLE SOURCE of the per-axis transform shared by the per-turn engine
 * (`advanceNineAxisSicSequence`) and the batched engine (`advanceNineAxisSicBatch`),
 * so a batched fill records each axis byte-identically to 10 sequential turns.
 */
function fillAxisFromUserInput(userInput: string): SicAxis {
  return {
    summary: userInput.trim(),
    refs: extractRefs(csv(userInput)),
    status: "filled",
  };
}

/** The not-applicable axis a user-waived turn produces (mirrors the gate's N/A path). */
const NOT_APPLICABLE_AXIS: SicAxis = { summary: "(not applicable)", refs: [], status: "not-applicable" };

/**
 * Advance the 9-axis SIC sequence by one turn (turnIndex 0-9).
 * T0 records rawIntent/confirmedIntent. T1-T9 fill one axis each:
 * summary = the free-text answer; refs = path/rid-like tokens; status = "filled".
 */
export function advanceNineAxisSicSequence(
  contract: SemanticIntentContract,
  turnIndex: number,
  userInput?: string,
  agentAutoFill?: Partial<SemanticIntentContract>,
): NineAxisSicContract {
  if (turnIndex < 0 || turnIndex >= NINE_AXIS_SIC_SEQUENCE.length) {
    throw new RangeError(
      `advanceNineAxisSicSequence: turnIndex must be 0-${NINE_AXIS_SIC_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }
  const ext = contract as NineAxisSicContract;
  const descriptor = NINE_AXIS_SIC_SEQUENCE[turnIndex]!;
  const source: SicFillSource =
    userInput !== undefined ? "user" : agentAutoFill !== undefined ? "agent" : "system";
  const step: SicFillStep = {
    step: descriptor.step,
    question: descriptor.question,
    answer: userInput ?? (agentAutoFill ? JSON.stringify(agentAutoFill) : undefined),
    filledAt: new Date().toISOString(),
    source,
  };

  const autoFillFields: Partial<SemanticIntentContract> =
    agentAutoFill !== undefined && userInput === undefined ? agentAutoFill : {};

  const baseAxes: SemanticIntentAxes = ext.axes ?? emptyAxes();
  let nextAxes: SemanticIntentAxes = baseAxes;
  const t0Fields: Partial<SemanticIntentContract> = {};

  if (turnIndex === 0 && userInput !== undefined) {
    t0Fields.rawIntent = contract.rawIntent || userInput.trim();
    t0Fields.confirmedIntent = contract.confirmedIntent || userInput.trim();
  } else if (descriptor.targetAxis !== undefined && userInput !== undefined) {
    nextAxes = {
      ...baseAxes,
      [descriptor.targetAxis]: fillAxisFromUserInput(userInput),
    } as SemanticIntentAxes;
  }

  return {
    ...contract,
    ...autoFillFields,
    ...t0Fields,
    fillPolicy: NINE_AXIS_SIC_POLICY,
    axes: nextAxes,
    fillSequence: [...(ext.fillSequence ?? []), step],
  } as NineAxisSicContract;
}

// ---------------------------------------------------------------------------
// Batched multi-axis fill (first-class) — fill several turns in ONE round-trip.
// ---------------------------------------------------------------------------

/**
 * One axis answer in a batched fill. Exactly one of `answer` / `notApplicable`
 * carries the signal:
 *   - `answer`         — the user's free-text confirmation for the axis (user-sourced,
 *                        recorded the same as a per-turn `turnUserInput`).
 *   - `notApplicable`  — `true` waives the axis (user-sourced `status:"not-applicable"`),
 *                        mirroring the per-turn `turnNotApplicable` path.
 * `notApplicable` is ignored on the intent turn (T0 has no axis).
 */
export interface NineAxisBatchTurn {
  readonly answer?: string;
  readonly notApplicable?: boolean;
  /**
   * Provenance of this axis answer. Mirrors the per-turn engine's derived
   * `SicFillStep.source`. Absent ⇒ "user" (byte-identical to the prior hardcode),
   * so a Lead/agent-sourced batch fill records honest `source:"agent"`/"system"
   * instead of forging user-confirmation provenance.
   */
  readonly source?: SicFillSource;
}

/**
 * A batch of axis answers keyed by turn target. `intent` fills T0 (rawIntent +
 * confirmedIntent); each `SicAxisKey` fills its corresponding axis turn. Only the
 * keys present are applied — a partial batch is valid and accumulates onto the
 * threaded contract exactly like a partial run of sequential turns.
 */
export type NineAxisBatchInput = {
  readonly intent?: string;
  /**
   * Provenance of the T0 intent step. Mirrors the per-turn engine's derived
   * `SicFillStep.source`. Absent ⇒ "user" (byte-identical to the prior hardcode);
   * a Lead-captured summary should pass "agent" rather than forge "user".
   */
  readonly intentSource?: SicFillSource;
} & {
  readonly [K in SicAxisKey]?: NineAxisBatchTurn;
};

/**
 * Result of a batched multi-axis fill — the same accumulating contract the
 * per-turn engine returns, plus the list of turn indices applied in this call.
 */
export interface NineAxisBatchResult {
  /** The contract after every batched turn was applied (thread back like the per-turn contract). */
  readonly contract: NineAxisSicContract;
  /** Turn indices applied this call, ascending (e.g. [0,1,2,...]). */
  readonly appliedTurns: readonly number[];
  /** True once T0 + all 9 axes are filled-or-not-applicable (== isNineAxisSicComplete). */
  readonly fillComplete: boolean;
}

/**
 * FIRST-CLASS batched multi-axis 9-axis fill: apply several axis turns (and/or the
 * intent turn) in ONE round-trip instead of N sequential `advanceNineAxisSicSequence`
 * calls. Cuts the N-times-10 round-trips per concept WITHOUT removing the strict
 * per-axis path (that engine is unchanged; this composes the SAME per-axis transform).
 *
 * Every applied axis records a user-sourced `SicFillStep` byte-identically to the
 * per-turn engine, so a full batch reaches the same `isNineAxisSicComplete` / Q2
 * readiness as 10 sequential per-turn calls. Turns apply in canonical sequence order
 * (T0 → T9) regardless of input key order, so the accumulated `fillSequence` is ordered.
 *
 * @param contract   Current SemanticIntentContract (immutable read; thread the result back).
 * @param batch      The axis answers to apply this round-trip (any subset of intent + 9 axes).
 * @returns          NineAxisBatchResult with the accumulated contract, appliedTurns, fillComplete.
 */
export function advanceNineAxisSicBatch(
  contract: SemanticIntentContract,
  batch: NineAxisBatchInput,
): NineAxisBatchResult {
  const ext = contract as NineAxisSicContract;
  let axes: SemanticIntentAxes = ext.axes ?? emptyAxes();
  const steps: SicFillStep[] = [];
  const appliedTurns: number[] = [];
  let rawIntent = contract.rawIntent;
  let confirmedIntent = contract.confirmedIntent;

  // Apply in canonical sequence order so fillSequence stays ordered T0..T9.
  for (const descriptor of NINE_AXIS_SIC_SEQUENCE) {
    if (descriptor.turnIndex === 0) {
      const intent = batch.intent;
      if (intent === undefined) continue;
      rawIntent = rawIntent || intent.trim();
      confirmedIntent = confirmedIntent || intent.trim();
      steps.push({
        step: descriptor.step,
        question: descriptor.question,
        answer: intent,
        filledAt: new Date().toISOString(),
        source: batch.intentSource ?? "user",
      });
      appliedTurns.push(descriptor.turnIndex);
      continue;
    }

    const axisKey = descriptor.targetAxis;
    if (axisKey === undefined) continue;
    const turn = batch[axisKey];
    if (turn === undefined) continue;

    let nextAxis: SicAxis | undefined;
    let answer: string | undefined;
    // A notApplicable axis is ALWAYS the USER's explicit waiver (never an agent
    // skip — see the per-turn `turnNotApplicable` doc ~L271-272 and
    // nine-axis-understand-session.ts), so its provenance is hardcoded "user"
    // regardless of turn.source. The answered branch keeps the honest
    // `turn.source ?? "user"` so a Lead/agent-sourced answer records "agent".
    let stepSource: SicFillSource;
    if (turn.notApplicable === true) {
      nextAxis = NOT_APPLICABLE_AXIS;
      answer = "(N/A)";
      stepSource = "user";
    } else if (turn.answer !== undefined) {
      nextAxis = fillAxisFromUserInput(turn.answer);
      answer = turn.answer;
      stepSource = turn.source ?? "user";
    } else {
      continue;
    }

    axes = { ...axes, [axisKey]: nextAxis } as SemanticIntentAxes;
    steps.push({
      step: descriptor.step,
      question: descriptor.question,
      answer,
      filledAt: new Date().toISOString(),
      source: stepSource,
    });
    appliedTurns.push(descriptor.turnIndex);
  }

  const next: NineAxisSicContract = {
    ...contract,
    rawIntent,
    confirmedIntent,
    fillPolicy: NINE_AXIS_SIC_POLICY,
    axes,
    fillSequence: [...(ext.fillSequence ?? []), ...steps],
  } as NineAxisSicContract;

  return {
    contract: next,
    appliedTurns,
    fillComplete: isNineAxisSicComplete(next),
  };
}

export interface NineAxisReadinessIssue {
  readonly field: string;
  readonly message: string;
}

/** Issues blocking nine-axis-sic readiness (empty = complete). */
export function nineAxisSicReadinessIssues(
  contract: SemanticIntentContract,
): NineAxisReadinessIssue[] {
  const ext = contract as NineAxisSicContract;
  const issues: NineAxisReadinessIssue[] = [];
  if (!ext.fillSequence || ext.fillSequence.length < NINE_AXIS_SIC_SEQUENCE.length) {
    issues.push({
      field: "fillSequence",
      message: "nine-axis-sic requires all 10 turns (T0 + 9 axes) before approval",
    });
  }
  if (!contract.rawIntent || contract.rawIntent.trim().length === 0) {
    issues.push({ field: "rawIntent", message: "rawIntent is required" });
  }
  if (!contract.confirmedIntent || contract.confirmedIntent.trim().length === 0) {
    issues.push({ field: "confirmedIntent", message: "confirmedIntent is required" });
  }
  const axes = ext.axes;
  if (!axes) {
    issues.push({ field: "axes", message: "axes is required for nine-axis-sic" });
    return issues;
  }
  for (const key of AXIS_KEYS) {
    const axis = axes[key];
    if (!axis || (axis.status !== "filled" && axis.status !== "not-applicable")) {
      issues.push({ field: `axes.${key}`, message: `axis '${key}' must be filled or marked not-applicable` });
    }
  }
  return issues;
}

/** True when T0 intent + all 9 axes are filled-or-not-applicable. */
export function isNineAxisSicComplete(contract: SemanticIntentContract): boolean {
  return nineAxisSicReadinessIssues(contract).length === 0;
}
