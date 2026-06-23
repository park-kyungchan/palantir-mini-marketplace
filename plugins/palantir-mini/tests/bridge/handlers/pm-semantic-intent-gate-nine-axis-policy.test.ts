// Tests: fillPolicy='nine-axis-sic' → routed to the 9-axis understand-heart branch
// (NOT the legacy 8-turn fall-through). Regression guard for W3d-2a, which fixed the
// LIVE misroute where "nine-axis-sic" silently fell through to the legacy path
// (the gate had zero nine-axis refs).

import { afterEach, test, expect } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { semanticIntentGate } from "../../../bridge/handlers/pm-semantic-intent-gate";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import { draftSemanticIntentContract } from "../../../lib/lead-intent/contracts";
import { NINE_AXIS_SIC_SEQUENCE } from "../../../lib/semantic-intent/nine-axis-sic-fill-sequence";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sig-nine-axis-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

function makeDraftContract(intent: string): SemanticIntentContract {
  return draftSemanticIntentContract({ intent });
}

function readEvents(project: string): Array<Record<string, any>> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

test("nine-axis-sic + turn=0 → fillResult populated, nextQuestion is NINE_AXIS T1 (not legacy)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis start");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis start",
    turn: 0,
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turnUserInput: "build a grading dashboard",
  });

  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.appliedTurn).toBe(0);
  // PROOF of correct routing: the posed question + next question come from the
  // 9-axis sequence, NOT EIGHT_TURN_FILL_SEQUENCE (the legacy fall-through).
  expect(result.fillResult!.question).toBe(NINE_AXIS_SIC_SEQUENCE[0]!.question);
  expect(result.fillResult!.nextQuestion).toBe(NINE_AXIS_SIC_SEQUENCE[1]!.question);
  expect(result.fillResult!.fillComplete).toBe(false);
  // nine-axis is a SIC policy → fdeFillResult must NOT be populated.
  expect(result.fdeFillResult).toBeUndefined();
});

test("nine-axis-sic + turn=1 → axes.data filled (legacy 8-turn never sets axes)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis data axis");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis data axis",
    turn: 1, // T1 → axes.data
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turnUserInput: "Student, Assignment, Grade",
  });

  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.question).toBe(NINE_AXIS_SIC_SEQUENCE[1]!.question);
  // The discriminator vs the legacy path: axes is populated.
  const axes = result.fillResult!.contract.axes;
  expect(axes).toBeDefined();
  expect(axes!.data.status).toBe("filled");
  expect(axes!.data.summary).toContain("Student");
});

test("nine-axis-sic + turn=9 (last) without full axes → fillComplete false (fail-closed)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis last turn");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis last turn",
    turn: 9, // last (10 turns: T0 + 9 axes)
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turnUserInput: "prior similar grading rubric",
  });

  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.appliedTurn).toBe(9);
  expect(result.fillResult!.nextQuestion).toBeUndefined();
  // Only T9 filled this run → earlier axes still open → readiness incomplete.
  expect(result.fillResult!.fillComplete).toBe(false);
  expect(result.fillResult!.fillIncomplete).toBeDefined();
});

test("nine-axis-sic out-of-bounds turn → fillResult absent (non-fatal, no throw)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis out of bounds");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis out of bounds",
    turn: 99, // out of bounds for nine-axis (max 9)
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
  });

  expect(result.fillResult).toBeUndefined();
  // Handler should not throw.
});

test("nine-axis-sic turn → fillResult.turnCard present + well-formed, mirrors question/nextQuestion (Slice E2)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis turn card");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis turn card",
    turn: 1, // T1 → axes.data
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turnUserInput: "Member, Book, Loan",
  });

  expect(result.fillResult).toBeDefined();
  // Rich card is attached ALONGSIDE the bare strings.
  const card = result.fillResult!.turnCard;
  expect(card).toBeDefined();
  // The card targets the CURRENT turn and carries the bilingual question.
  expect(card!.decisionId).toBe("nine-axis-sic:T1:data");
  expect(card!.phase).toBe("data");
  expect(card!.plainKoreanTitle).toBe(NINE_AXIS_SIC_SEQUENCE[1]!.question);
  expect(card!.plainKoreanSummary).toBe(NINE_AXIS_SIC_SEQUENCE[1]!.questionEn);
  // The worked example is folded into whyItMatters (descriptor-sourced).
  expect(card!.whyItMatters).toContain(NINE_AXIS_SIC_SEQUENCE[1]!.exampleKo!);
  expect(card!.freeTextAllowed).toBe(true);
  // Without a proposed draft → 'answer' is the recommended choice (blank-box default).
  expect(card!.recommendedChoiceId).toBe("answer");
  expect(card!.choices.some((c) => c.choiceId === "confirm-draft")).toBe(false);
  // nextTurnCard mirrors nextQuestion (T2), built WITHOUT a draft.
  const nextCard = result.fillResult!.nextTurnCard;
  expect(nextCard).toBeDefined();
  expect(nextCard!.decisionId).toBe("nine-axis-sic:T2:logic");
  expect(nextCard!.plainKoreanTitle).toBe(NINE_AXIS_SIC_SEQUENCE[2]!.question);
  expect(nextCard!.recommendedChoiceId).toBe("answer");
});

test("nine-axis-sic turn + proposedAxisDraft → turnCard renders recommended confirm-draft choice (Slice E2)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis draft proposal");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis draft proposal",
    turn: 1, // T1 → axes.data
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    proposedAxisDraft: {
      textKo: "회원, 책, 대출기록 세 객체",
      textEn: "Three objects: member, book, loan record",
      rationaleKo: "도서관 흐름의 핵심 객체",
      rationaleEn: "the core objects of the library flow",
    },
  });

  expect(result.fillResult).toBeDefined();
  const card = result.fillResult!.turnCard;
  expect(card).toBeDefined();
  // With a proposed draft → confirm-draft is rendered FIRST and recommended.
  expect(card!.recommendedChoiceId).toBe("confirm-draft");
  const confirm = card!.choices.find((c) => c.choiceId === "confirm-draft");
  expect(confirm).toBeDefined();
  expect(confirm!.recommended).toBe(true);
  // The proposed draft text is carried into the card's confirm choice.
  expect(confirm!.consequence).toContain("회원, 책, 대출기록 세 객체");
  expect(confirm!.consequence).toContain("Three objects: member, book, loan record");
  // The draft is a proposal only — the bare strings remain the descriptor question.
  expect(result.fillResult!.question).toBe(NINE_AXIS_SIC_SEQUENCE[1]!.question);
});

test("nine-axis-sic turn → legacy fillResult.question unchanged by turnCard (regression pin, Slice E2)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis regression pin");

  const withDraft = await semanticIntentGate({
    project,
    rawIntent: "nine-axis regression pin",
    turn: 0,
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turnUserInput: "build a grading dashboard",
    proposedAxisDraft: { textKo: "초안", textEn: "draft" },
  });

  // The bare question/nextQuestion strings are byte-identical to the descriptor
  // sequence regardless of turnCard or a supplied proposedAxisDraft.
  expect(withDraft.fillResult!.question).toBe(NINE_AXIS_SIC_SEQUENCE[0]!.question);
  expect(withDraft.fillResult!.nextQuestion).toBe(NINE_AXIS_SIC_SEQUENCE[1]!.question);
  // T0 is the intent turn → its card has no not-applicable choice.
  expect(withDraft.fillResult!.turnCard!.choices.some((c) => c.choiceId === "not-applicable")).toBe(false);
});

test("nine-axis-sic last turn (T9) → turnCard present, nextTurnCard absent (mirrors nextQuestion)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis last card");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis last card",
    turn: 9, // last
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turnUserInput: "prior rubric decision",
  });

  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.turnCard).toBeDefined();
  expect(result.fillResult!.turnCard!.decisionId).toBe("nine-axis-sic:T9:memoryPrior");
  // No next turn after T9 → nextTurnCard mirrors nextQuestion (both absent).
  expect(result.fillResult!.nextQuestion).toBeUndefined();
  expect(result.fillResult!.nextTurnCard).toBeUndefined();
});

test("nine-axis-sic full T0–T9 fill → semantic_intent_contract_finalized emitted at T9 (W3d-2b)", async () => {
  const project = makeTmpProject();
  // One non-empty answer per turn: T0 = intent, T1–T9 = one axis each.
  const answers = [
    "build a grading dashboard",            // T0 → rawIntent/confirmedIntent
    "Student, Assignment, Grade",           // T1 → axes.data
    "weighted average per rubric",          // T2 → axes.logic
    "publish final grades to students",     // T3 → axes.action
    "teacher approves before publish",      // T4 → axes.governance
    "rubric.md, gradebook.csv",             // T5 → axes.context
    "every student has a final grade",      // T6 → axes.successEval
    "do not expose other students' grades", // T7 → axes.constraintsNonGoals
    "teacher runs it, admin authorizes",    // T8 → axes.actors
    "prior term's rubric decision",         // T9 → axes.memoryPrior
  ];

  let contract: SemanticIntentContract = makeDraftContract("nine-axis full fill");
  let result: Awaited<ReturnType<typeof semanticIntentGate>> | undefined;
  for (let turn = 0; turn < answers.length; turn++) {
    result = await semanticIntentGate({
      project,
      rawIntent: "nine-axis full fill",
      fillPolicy: "nine-axis-sic",
      turn,
      turnUserInput: answers[turn],
      semanticIntentContract: contract,
    });
    contract = result.fillResult!.contract as SemanticIntentContract;
  }

  // T9 with all axes filled → readiness complete → finalization emit.
  expect(result!.fillResult!.appliedTurn).toBe(9);
  expect(result!.fillResult!.fillComplete).toBe(true);

  const finalized = readEvents(project).find(
    (e) =>
      e.type === "validation_phase_completed" &&
      e.payload?.errorClass === "semantic_intent_contract_finalized",
  );
  expect(finalized).toBeDefined();
  expect(finalized!.payload?.fillPolicy).toBe("nine-axis-sic");
  expect(finalized!.payload?.verdict).toBe("filled");
});

// ---------------------------------------------------------------------------
// P1-7-wire — BATCH 9-axis fill is runtime-reachable through the MCP gate.
// Proves advanceNineAxisSicBatch is no longer dead code: a single gate call with
// `nineAxisBatch` fills multiple turns; a FULL batch reaches the same fillComplete +
// finalization as 10 sequential per-turn calls.
// ---------------------------------------------------------------------------

const FULL_BATCH = {
  intent: "build a grading dashboard",
  data: { answer: "Student, Assignment, Grade" },
  logic: { answer: "weighted average per rubric" },
  action: { answer: "publish final grades to students" },
  governance: { answer: "teacher approves before publish" },
  context: { answer: "rubric.md, gradebook.csv" },
  successEval: { answer: "every student has a final grade" },
  constraintsNonGoals: { answer: "do not expose other students' grades" },
  actors: { answer: "teacher runs it, admin authorizes" },
  memoryPrior: { answer: "prior term's rubric decision" },
} as const;

test("nine-axis-sic FULL batch (one call) → fillComplete true + nineAxisBatchResult + finalization emit", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis full batch");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis full batch",
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    nineAxisBatch: FULL_BATCH,
  });

  // Batch summary present and complete.
  expect(result.nineAxisBatchResult).toBeDefined();
  expect(result.nineAxisBatchResult!.fillComplete).toBe(true);
  // T0 + 9 axes applied in canonical order.
  expect(result.nineAxisBatchResult!.appliedTurns).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // The accumulated contract rides on fillResult.contract (shared persistence/projection).
  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.fillComplete).toBe(true);
  // The synthesized fillResult anchors to the LAST applied turn (T9 → memoryPrior).
  expect(result.fillResult!.appliedTurn).toBe(9);
  const axes = result.fillResult!.contract.axes;
  expect(axes!.data.status).toBe("filled");
  expect(axes!.memoryPrior.status).toBe("filled");

  // Finalization lineage row fires for a completing batch (mirrors per-turn T9).
  const finalized = readEvents(project).find(
    (e) =>
      e.type === "validation_phase_completed" &&
      e.payload?.errorClass === "semantic_intent_contract_finalized",
  );
  expect(finalized).toBeDefined();
  expect(finalized!.payload?.fillPolicy).toBe("nine-axis-sic");
  // The batch-advanced lineage row also fires.
  const batchAdvanced = readEvents(project).find(
    (e) =>
      e.type === "validation_phase_completed" &&
      e.payload?.errorClass === "nine_axis_sic_batch_advanced",
  );
  expect(batchAdvanced).toBeDefined();
});

test("nine-axis-sic PARTIAL batch → accumulates without completing (fail-closed)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis partial batch");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis partial batch",
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    nineAxisBatch: {
      intent: "build a grading dashboard",
      data: { answer: "Student, Assignment, Grade" },
      logic: { answer: "weighted average per rubric" },
    },
  });

  expect(result.nineAxisBatchResult).toBeDefined();
  expect(result.nineAxisBatchResult!.appliedTurns).toEqual([0, 1, 2]);
  expect(result.nineAxisBatchResult!.fillComplete).toBe(false);
  expect(result.fillResult!.fillComplete).toBe(false);
  expect(result.fillResult!.fillIncomplete).toBeDefined();
  // Last applied turn was T2 (logic).
  expect(result.fillResult!.appliedTurn).toBe(2);
});

test("nine-axis-sic batch threads across two calls → second call completes", async () => {
  const project = makeTmpProject();
  let contract: SemanticIntentContract = makeDraftContract("nine-axis two-call batch");

  const first = await semanticIntentGate({
    project,
    rawIntent: "nine-axis two-call batch",
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    nineAxisBatch: {
      intent: FULL_BATCH.intent,
      data: FULL_BATCH.data,
      logic: FULL_BATCH.logic,
      action: FULL_BATCH.action,
      governance: FULL_BATCH.governance,
    },
  });
  expect(first.nineAxisBatchResult!.fillComplete).toBe(false);
  contract = first.fillResult!.contract as SemanticIntentContract;

  const second = await semanticIntentGate({
    project,
    rawIntent: "nine-axis two-call batch",
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    nineAxisBatch: {
      context: FULL_BATCH.context,
      successEval: FULL_BATCH.successEval,
      constraintsNonGoals: FULL_BATCH.constraintsNonGoals,
      actors: FULL_BATCH.actors,
      memoryPrior: FULL_BATCH.memoryPrior,
    },
  });
  expect(second.nineAxisBatchResult!.fillComplete).toBe(true);
  expect(second.fillResult!.fillComplete).toBe(true);
});

test("nine-axis-sic batch supports per-axis not-applicable waiver", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis batch N/A");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis batch N/A",
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    nineAxisBatch: {
      ...FULL_BATCH,
      memoryPrior: { notApplicable: true },
    },
  });

  // A waived axis still counts toward completeness (status not-applicable).
  expect(result.nineAxisBatchResult!.fillComplete).toBe(true);
  expect(result.fillResult!.contract.axes!.memoryPrior.status).toBe("not-applicable");
});

test("nineAxisBatch ABSENT → per-axis turn path byte-identical (no nineAxisBatchResult)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("nine-axis no batch");

  const result = await semanticIntentGate({
    project,
    rawIntent: "nine-axis no batch",
    fillPolicy: "nine-axis-sic",
    semanticIntentContract: contract,
    turn: 1,
    turnUserInput: "Student, Assignment, Grade",
  });

  expect(result.nineAxisBatchResult).toBeUndefined();
  expect(result.fillResult).toBeDefined();
  expect(result.fillResult!.appliedTurn).toBe(1);
  expect(result.fillResult!.contract.axes!.data.status).toBe("filled");
});

test("nineAxisBatch ignored on a NON-nine-axis fillPolicy (fde-ontology-build)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("batch ignored on fde");

  const result = await semanticIntentGate({
    project,
    rawIntent: "batch ignored on fde",
    fillPolicy: "fde-ontology-build",
    semanticIntentContract: contract,
    turn: 0,
    turnUserInput: "fde turn answer",
    // A batch is supplied but must be IGNORED — fde policy is not batch-eligible.
    nineAxisBatch: FULL_BATCH,
  });

  // No batch result; the FDE per-turn path ran instead.
  expect(result.nineAxisBatchResult).toBeUndefined();
  expect(result.fdeFillResult).toBeDefined();
  expect(result.fdeFillResult!.appliedTurn).toBe(0);
});
