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
