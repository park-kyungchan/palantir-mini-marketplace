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
  },
  {
    turnIndex: 1,
    step: 2,
    targetField: "axes.data",
    targetAxis: "data",
    question: "이 일이 다루는 정보나 대상(객체)은 무엇인가요?",
    questionEn: "What information or objects does this touch?",
  },
  {
    turnIndex: 2,
    step: 3,
    targetField: "axes.logic",
    targetAxis: "logic",
    question: "어떤 규칙·계산·판단이 적용되나요?",
    questionEn: "What rule, computation, or decision applies?",
  },
  {
    turnIndex: 3,
    step: 4,
    targetField: "axes.action",
    targetAxis: "action",
    question: "무엇이 실제로 바뀌거나 실행되나요?",
    questionEn: "What change or execution actually happens?",
  },
  {
    turnIndex: 4,
    step: 5,
    targetField: "axes.governance",
    targetAxis: "governance",
    question: "누가 해도 되나요? 무엇이 안전하고, 무엇이 승인을 필요로 하나요?",
    questionEn: "Who may do it? What is safe, and what needs approval?",
  },
  {
    turnIndex: 5,
    step: 6,
    targetField: "axes.context",
    targetAxis: "context",
    question: "어떤 자료·문서·출처를 근거로 써야 하나요?",
    questionEn: "What data, documents, or sources should it rely on?",
  },
  {
    turnIndex: 6,
    step: 7,
    targetField: "axes.successEval",
    targetAxis: "successEval",
    question: "'다 됐다' 또는 '맞다'는 것을 무엇으로 판단하나요?",
    questionEn: "How do we judge that it is done or correct?",
  },
  {
    turnIndex: 7,
    step: 8,
    targetField: "axes.constraintsNonGoals",
    targetAxis: "constraintsNonGoals",
    question: "무엇이 일어나면 안 되나요? 건드리면 안 되는 범위는 어디까지인가요?",
    questionEn: "What must NOT happen, and what is out of bounds?",
  },
  {
    turnIndex: 8,
    step: 9,
    targetField: "axes.actors",
    targetAxis: "actors",
    question: "누가 실행하고, 누구의 권한이 필요한가요?",
    questionEn: "Who runs it, and whose authority is needed?",
  },
  {
    turnIndex: 9,
    step: 10,
    targetField: "axes.memoryPrior",
    targetAxis: "memoryPrior",
    question: "재사용할 만한, 과거의 비슷한 결정이 있나요?",
    questionEn: "Is there a prior, similar decision worth reusing?",
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
    const values = csv(userInput);
    const axis: SicAxis = {
      summary: userInput.trim(),
      refs: extractRefs(values),
      status: "filled",
    };
    nextAxes = { ...baseAxes, [descriptor.targetAxis]: axis } as SemanticIntentAxes;
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
