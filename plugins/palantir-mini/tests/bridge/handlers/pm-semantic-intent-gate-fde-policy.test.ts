// Tests: fillPolicy='fde-ontology-build' → fdeFillResult populated correctly.
// Validates the FDE 9-step additive path in pm-semantic-intent-gate.

import { afterEach, test, expect } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { semanticIntentGate } from "../../../bridge/handlers/pm-semantic-intent-gate";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import { draftSemanticIntentContract } from "../../../lib/lead-intent/contracts";
import { FDE_FILL_SEQUENCE } from "../../../lib/semantic-intent/fde-fill-sequence";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sig-fde-policy-"));
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

test("fillPolicy='fde-ontology-build' + turn=0 → fdeFillResult populated, policy='fde-ontology-build'", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("FDE design start");

  const result = await semanticIntentGate({
    project,
    rawIntent: "FDE design start",
    turn: 0,
    fillPolicy: "fde-ontology-build",
    semanticIntentContract: contract,
  });

  expect(result.fdeFillResult).toBeDefined();
  expect(result.fdeFillResult!.policy).toBe("fde-ontology-build");
  expect(result.fdeFillResult!.appliedTurn).toBe(0);
  expect(result.fdeFillResult!.question).toContain("operational decision");
  // fdeFillResult present means fillResult must NOT be present (mutually exclusive)
  expect((result as any).fillResult).toBeUndefined();
});

test("fillPolicy='fde-ontology-build' + turn=0 → fillComplete false (not last turn)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("FDE test");

  const result = await semanticIntentGate({
    project,
    rawIntent: "FDE test",
    turn: 0,
    fillPolicy: "fde-ontology-build",
    semanticIntentContract: contract,
  });

  expect(result.fdeFillResult).toBeDefined();
  expect(result.fdeFillResult!.fillComplete).toBe(false);
  expect(result.fdeFillResult!.nextQuestion).toBeDefined();
  expect(result.fdeFillResult!.nextQuestion).toBe(FDE_FILL_SEQUENCE[1]!.question);
});

test("fillPolicy='fde-ontology-build' + turn=8 (last) → fillComplete true, nextQuestion absent", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("FDE finalization test");

  const result = await semanticIntentGate({
    project,
    rawIntent: "FDE finalization test",
    turn: 8,
    fillPolicy: "fde-ontology-build",
    semanticIntentContract: contract,
  });

  expect(result.fdeFillResult).toBeDefined();
  expect(result.fdeFillResult!.fillComplete).toBe(true);
  expect(result.fdeFillResult!.nextQuestion).toBeUndefined();
  expect(result.fdeFillResult!.appliedTurn).toBe(8);
});

test("fillPolicy='fde-ontology-build' + turn supplied → contract has fillSequence appended", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("FDE object types test");

  const result = await semanticIntentGate({
    project,
    rawIntent: "FDE object types test",
    turn: 2,
    fillPolicy: "fde-ontology-build",
    semanticIntentContract: contract,
    turnUserInput: "Order,Customer,Product",
  });

  expect(result.fdeFillResult).toBeDefined();
  const resultContract = result.fdeFillResult!.contract;
  expect(resultContract.fillSequence).toBeDefined();
  expect(resultContract.fillSequence!.length).toBeGreaterThanOrEqual(1);
  // approvedNouns should contain the user-supplied items
  expect(resultContract.approvedNouns).toContain("Order");
  expect(resultContract.approvedNouns).toContain("Customer");
  expect(resultContract.approvedNouns).toContain("Product");
});

test("fillPolicy='fde-ontology-build' out-of-bounds turn → fdeFillResult absent (non-fatal error)", async () => {
  const project = makeTmpProject();
  const contract = makeDraftContract("FDE out-of-bounds test");

  const result = await semanticIntentGate({
    project,
    rawIntent: "FDE out-of-bounds test",
    turn: 99, // out of bounds for FDE (max 8)
    fillPolicy: "fde-ontology-build",
    semanticIntentContract: contract,
  });

  // Errors in FDE fill are non-fatal; fdeFillResult absent
  expect(result.fdeFillResult).toBeUndefined();
  // Handler should not throw
});
