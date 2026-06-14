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
  SicAxisFacet,
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
 * A Lead-proposed plain-language draft answer for the current turn. When present,
 * the card renders a "confirm this draft" choice FIRST (recommended) so the user
 * confirms or corrects rather than facing a blank box. The draft is a proposal —
 * it only becomes the recorded answer (source 'user') once the user confirms.
 */
export interface NineAxisProposedDraft {
  /** Korean draft text (the proposed answer). */
  readonly textKo?: string;
  /** English mirror of the draft text. */
  readonly textEn?: string;
  /** Korean one-line rationale for the proposal. */
  readonly rationaleKo?: string;
  /** English mirror of the rationale. */
  readonly rationaleEn?: string;
  /**
   * DP-1: an optional one-line rendering of the proposal's typed graph (e.g.
   * `"3 objects, 2 links; 1 link with an unresolved endpoint"`) so the user
   * confirms the *graph*, not just the sentence. Prose-only on the card — the
   * typed `SicAxisFacet` is what downstream binds to. Use {@link renderDataGraphLine}
   * to derive it from a `data-graph` facet. Absent ⇒ the confirm-draft consequence
   * stays byte-identical to the no-facet card.
   */
  readonly graphLine?: string;
}

/** Options for {@link nineAxisTurnCard}. Absent options => today's two-choice card (back-compat). */
export interface NineAxisTurnCardOptions {
  /** Lead-proposed draft; renders the recommended 'confirm-draft' choice first. */
  readonly proposedDraft?: NineAxisProposedDraft;
  /** Lead-proposed reason (KO) for marking the axis not-applicable (rendered in the N/A consequence). */
  readonly naReasonKo?: string;
  /** English mirror of `naReasonKo`. */
  readonly naReasonEn?: string;
}

/** Render the descriptor's generic worked example as a bilingual body line, or "" when absent. */
function exampleLine(d: NineAxisTurnDescriptor): string {
  if (!d.exampleKo && !d.exampleEn) return "";
  const ko = d.exampleKo ?? "";
  const en = d.exampleEn ?? "";
  return `\n좋은 답 예시 / Example of a good answer: ${ko}${ko && en ? " / " : ""}${en}`;
}

/** Render the proposed draft text as a bilingual fragment for the confirm-draft choice. */
function draftText(draft: NineAxisProposedDraft): string {
  const ko = draft.textKo ?? "";
  const en = draft.textEn ?? "";
  return `${ko}${ko && en ? " / " : ""}${en}`;
}

/**
 * Render the proposed-draft rationale (KO / EN) as a bilingual trailing fragment,
 * mirroring how `naReason` is appended for the N/A consequence. "" when absent.
 */
function draftRationale(draft: NineAxisProposedDraft): string {
  const ko = draft.rationaleKo ?? "";
  const en = draft.rationaleEn ?? "";
  if (!ko && !en) return "";
  return ` (제안 이유 / Why proposed: ${ko}${ko && en ? " / " : ""}${en})`;
}

/**
 * DP-1: render a `data-graph` facet as a one-line graph summary for the DATA
 * confirm-draft card (e.g. `"2 objects, 1 link; 1 link with an unresolved endpoint"`).
 * Returns `undefined` for a non-`data-graph` facet (or `undefined` facet) so the
 * caller leaves `graphLine` unset and the card stays byte-identical. Prose-only —
 * the typed facet, not this string, is what downstream binds to.
 */
export function renderDataGraphLine(facet: SicAxisFacet | undefined): string | undefined {
  if (facet === undefined || facet.kind !== "data-graph") return undefined;
  const objectCount = facet.objects.length;
  const linkCount = facet.links.length;
  const unresolvedCount = facet.links.filter((link) => !link.endpointsResolved).length;
  const objectWord = objectCount === 1 ? "object" : "objects";
  const linkWord = linkCount === 1 ? "link" : "links";
  const base = `${objectCount} ${objectWord}, ${linkCount} ${linkWord}`;
  if (unresolvedCount === 0) return base;
  const unresolvedWord = unresolvedCount === 1 ? "link" : "links";
  return `${base}; ${unresolvedCount} ${unresolvedWord} with an unresolved endpoint`;
}

/**
 * Render the proposed-draft graph line (DP-1) as a bilingual-neutral trailing
 * fragment for the confirm-draft consequence. "" when absent ⇒ byte-identical to
 * the no-facet card.
 */
function draftGraphLine(draft: NineAxisProposedDraft): string {
  const line = draft.graphLine ?? "";
  return line.length > 0 ? ` (그래프 / graph: ${line})` : "";
}

/**
 * Build the non-developer elicitation card for a given turn (0..9).
 * KO question -> plainKoreanTitle; EN mirror -> plainKoreanSummary (bilingual).
 *
 * Without `opts.proposedDraft`: free-text answer (recommended) or mark the axis
 * not-applicable — byte-identical to the original two-choice card.
 *
 * With `opts.proposedDraft`: a recommended 'confirm-draft' choice is rendered FIRST
 * (confirming records the draft as the user's own answer); free-text 'answer' is
 * demoted to a correct-it choice; 'not-applicable' is preserved.
 */
export function nineAxisTurnCard(
  turnIndex: number,
  opts?: NineAxisTurnCardOptions,
): TurnCardDecisionSpec {
  if (turnIndex < 0 || turnIndex >= NINE_AXIS_SIC_SEQUENCE.length) {
    throw new RangeError(
      `nineAxisTurnCard: turnIndex must be 0-${NINE_AXIS_SIC_SEQUENCE.length - 1}, got ${turnIndex}`,
    );
  }
  const d: NineAxisTurnDescriptor = NINE_AXIS_SIC_SEQUENCE[turnIndex]!;
  const isIntent = d.targetAxis === undefined;
  const whyBase = isIntent
    ? "의도를 한 문장으로 고정하면 이후 9축이 거기서 파생됩니다. / Fixing the intent in one sentence anchors the 9 axes that follow."
    : AXIS_WHY[d.targetAxis as SicAxisKey];
  const why = whyBase + exampleLine(d);

  const draft = opts?.proposedDraft;
  const hasDraft =
    draft !== undefined && ((draft.textKo ?? "").length > 0 || (draft.textEn ?? "").length > 0);

  // Bilingual N/A consequence — Lead-proposed reason (when supplied) + the Q1 invariant:
  // not-applicable is recorded as the USER's explicit decision, never an agent skip.
  const naReason =
    (opts?.naReasonKo ?? "") || (opts?.naReasonEn ?? "")
      ? ` (제안 이유 / proposed reason: ${opts?.naReasonKo ?? ""}${
          (opts?.naReasonKo ?? "") && (opts?.naReasonEn ?? "") ? " / " : ""
        }${opts?.naReasonEn ?? ""})`
      : "";
  const naConsequence = isIntent
    ? ""
    : `${d.targetAxis} 축을 not-applicable로 표시 — 사용자가 명시적으로 선택한 결정으로 기록됩니다${naReason}` +
      ` / marks ${d.targetAxis} not-applicable — recorded as the USER's explicit decision${naReason}`;

  const confirmDraftChoice = hasDraft
    ? {
        choiceId: "confirm-draft",
        label: "제안 확정 / Confirm proposal",
        consequence:
          `이 제안을 당신의 답으로 기록: "${draftText(draft!)}" / records this proposal as YOUR answer` +
          draftRationale(draft!) +
          draftGraphLine(draft!),
        recommended: true,
      }
    : null;

  const answerChoice = {
    choiceId: "answer",
    label: "직접 입력 / Enter",
    consequence: isIntent
      ? "rawIntent + confirmedIntent를 기록 / records the intent"
      : `${d.targetAxis} 축을 채움 / fills the ${d.targetAxis} axis`,
    recommended: !hasDraft,
  };

  const naChoice = isIntent
    ? null
    : {
        choiceId: "not-applicable",
        label: "해당 없음 / N/A",
        consequence: naConsequence,
      };

  const choices = [confirmDraftChoice, answerChoice, naChoice].filter(
    (c): c is NonNullable<typeof c> => c !== null,
  );

  return {
    decisionId: `nine-axis-sic:T${turnIndex}${isIntent ? ":intent" : ":" + d.targetAxis}`,
    phase: isIntent ? "intent" : (d.targetAxis as string),
    plainKoreanTitle: d.question,
    plainKoreanSummary: d.questionEn,
    whyItMatters: why,
    recommendedChoiceId: hasDraft ? "confirm-draft" : "answer",
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
  /** Free-text answer for the current turn (the user correcting / writing their own). */
  readonly text?: string;
  /**
   * The user confirmed the Lead's proposed draft (the 'confirm-draft' choice). The
   * draft text is recorded as the axis/intent answer with source 'user' — confirming
   * a proposal IS a user decision, identical to typing it. Takes effect only when
   * non-empty; `text` (an explicit correction) wins if both are supplied.
   */
  readonly confirmedDraftText?: string;
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
    // A correction (non-empty text) wins; otherwise a confirmed draft is recorded
    // as the user's answer; either way source is 'user' via advanceNineAxisSicSequence.
    const userText =
      answer.text !== undefined && answer.text.length > 0
        ? answer.text
        : answer.confirmedDraftText ?? answer.text ?? "";
    next = advanceNineAxisSicSequence(session.contract, turnIndex, userText);
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
