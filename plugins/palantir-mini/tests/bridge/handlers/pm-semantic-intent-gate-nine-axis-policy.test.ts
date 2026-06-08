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
