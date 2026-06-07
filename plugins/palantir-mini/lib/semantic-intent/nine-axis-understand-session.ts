// palantir-mini — 9-axis understand session (the heart's elicitation surface).
//
// Wraps the nine-axis-sic engine into a runnable, runtime-neutral elicitation:
//   - nineAxisTurnCard(turnIndex)        -> TurnCardDecisionSpec (non-dev card)
//   - a functional session runner (start / nextCard / answerCard / complete)
// Runtime adapters (Claude skill, Codex) render the TurnCardDecisionSpec
// natively; this module decides nothing runtime-specific. Bilingual (KO / EN).

import type { SemanticIntentContract, TurnCardDecisionSpec } from "../lead-intent/contracts";
import {
  NINE_AXIS_SIC_SEQUENCE,
  advanceNineAxisSicSequence,
  isNineAxisSicComplete,
  type NineAxisSicContract,
  type NineAxisTurnDescriptor,
} from "./nine-axis-sic-fill-sequence";
import type {
  SicAxisKey,
  SemanticIntentAxes,
  SicAxis,
} from "#schemas/ontology/primitives/semantic-intent-contract";

/** Per-axis non-developer rationale (KO / EN) shown on the elicitation card. */
const AXIS_WHY: Record<SicAxisKey, string> = {
  data: "잘못된 대상에 작업하면 결과 전체가 틀어집니다. / Working on the wrong objects derails the whole result.",
  logic: "규칙을 잘못 잡으면 맞는 데이터로도 틀린 결정을 합니다. / Wrong rules produce wrong decisions even on the right data.",
  action: "무엇이 실제로 바뀌는지가 위험과 승인 범위를 정합니다. / What actually changes sets the risk and approval scope.",
  governance: "권한·안전·승인 경계를 먼저 정해야 안전하게 실행됩니다. / Permissions, safety, and approval must be set before acting.",
  context: "근거 출처를 좁혀야 환각과 context 오염을 막습니다. / Narrowing the sources prevents hallucination and context pollution.",
  successEval: "'완료'의 정의가 없으면 검증할 수 없습니다. / Without a definition of 'done' there is nothing to verify.",
  constraintsNonGoals: "건드리면 안 되는 것이 암묵적 의도의 핵심입니다. / What must NOT change is where implicit intent lives.",
  actors: "실행자와 권한이 lineage(byWhom)와 책임을 정합니다. / The runner and authority set lineage (byWhom) and accountability.",
  memoryPrior: "과거 결정의 재사용이 일관성과 속도를 줍니다. / Reusing prior decisions gives consistency and speed.",
};

/**
 * Build the non-developer elicitation card for a given turn (0..9).
 * KO question -> plainKoreanTitle; EN mirror -> plainKoreanSummary (bilingual).
 * Choices: free-text answer (recommended) or mark the axis not-applicable.
 */
export function nineAxisTurnCard(turnIndex: number): TurnCardDecisionSpec {
  if (turnIndex < 0 || turnIndex >= NINE_AXIS_SIC_SEQUENCE.length) {
    throw new RangeError(
      `nineAxisTurnCard: turnIndex must be 0-${NINE_AXIS_SIC_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }
  const d: NineAxisTurnDescriptor = NINE_AXIS_SIC_SEQUENCE[turnIndex]!;
  const isIntent = d.targetAxis === undefined;
  const why = isIntent
    ? "의도를 한 문장으로 고정하면 이후 9축이 거기서 파생됩니다. / Fixing the intent in one sentence anchors the 9 axes that follow."
    : AXIS_WHY[d.targetAxis as SicAxisKey];

  const choices = isIntent
    ? [
        {
          choiceId: "answer",
          label: "직접 입력 / Enter",
          consequence: "rawIntent + confirmedIntent를 기록 / records the intent",
          recommended: true,
        },
      ]
    : [
        {
          choiceId: "answer",
          label: "직접 입력 / Enter",
          consequence: `${d.targetAxis} 축을 채움 / fills the ${d.targetAxis} axis`,
          recommended: true,
        },
        {
          choiceId: "not-applicable",
          label: "해당 없음 / N/A",
          consequence: `${d.targetAxis} 축을 not-applicable로 표시 / marks ${d.targetAxis} not-applicable`,
        },
      ];

  return {
    decisionId: `nine-axis-sic:T${turnIndex}${isIntent ? ":intent" : ":" + d.targetAxis}`,
    phase: isIntent ? "intent" : (d.targetAxis as string),
    plainKoreanTitle: d.question,
    plainKoreanSummary: d.questionEn,
    whyItMatters: why,
    recommendedChoiceId: "answer",
    choices,
    evidenceRefs: [],
    blocking: false,
    freeTextAllowed: true,
  };
}

// --- session runner ---------------------------------------------------------

export interface NineAxisSession {
  /** Accumulated contract (axes + fillSequence). */
  readonly contract: NineAxisSicContract;
  /** Index of the NEXT turn to ask (0..10; === sequence length means complete). */
  readonly turnIndex: number;
}

/** Start a session from a base contract (e.g. an empty draft, or one seeded with rawIntent). */
export function startNineAxisSession(base: SemanticIntentContract): NineAxisSession {
  return { contract: base as NineAxisSicContract, turnIndex: 0 };
}

/** The card for the current turn, or null when the session is complete. */
export function nextCard(session: NineAxisSession): TurnCardDecisionSpec | null {
  if (session.turnIndex >= NINE_AXIS_SIC_SEQUENCE.length) return null;
  return nineAxisTurnCard(session.turnIndex);
}

export interface NineAxisAnswer {
  /** Free-text answer for the current turn. */
  readonly text?: string;
  /** Mark the current axis not-applicable (ignored on the intent turn). */
  readonly notApplicable?: boolean;
}

/** Apply an answer to the current turn and advance the session by one turn. */
export function answerCard(session: NineAxisSession, answer: NineAxisAnswer): NineAxisSession {
  const turnIndex = session.turnIndex;
  if (turnIndex >= NINE_AXIS_SIC_SEQUENCE.length) return session;
  const d = NINE_AXIS_SIC_SEQUENCE[turnIndex]!;

  let next: NineAxisSicContract;
  if (answer.notApplicable && d.targetAxis !== undefined) {
    const advanced = advanceNineAxisSicSequence(session.contract, turnIndex, "(N/A)");
    const axes = advanced.axes!;
    const axis: SicAxis = { summary: "(not applicable)", refs: [], status: "not-applicable" };
    next = { ...advanced, axes: { ...axes, [d.targetAxis]: axis } as SemanticIntentAxes };
  } else {
    next = advanceNineAxisSicSequence(session.contract, turnIndex, answer.text ?? "");
  }
  return { contract: next, turnIndex: turnIndex + 1 };
}

/** True when all 10 turns are done and the 9-axis SIC is complete. */
export function isSessionComplete(session: NineAxisSession): boolean {
  return (
    session.turnIndex >= NINE_AXIS_SIC_SEQUENCE.length &&
    isNineAxisSicComplete(session.contract)
  );
}

/** The accumulated SemanticIntentContract (with axes). */
export function sessionContract(session: NineAxisSession): NineAxisSicContract {
  return session.contract;
}
