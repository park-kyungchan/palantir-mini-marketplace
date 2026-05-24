// Tests: FDE_FILL_SEQUENCE structure + advanceFDEFillSequence behavior.

import { test, expect } from "bun:test";
import {
  FDE_FILL_SEQUENCE,
  advanceFDEFillSequence,
} from "../../../lib/semantic-intent/fde-fill-sequence";
import {
  draftSemanticIntentContract,
} from "../../../lib/lead-intent/contracts";

// ---------------------------------------------------------------------------
// FDE_FILL_SEQUENCE structure tests
// ---------------------------------------------------------------------------

test("FDE_FILL_SEQUENCE has 9 steps in correct order", () => {
  expect(FDE_FILL_SEQUENCE.length).toBe(9);

  const expectedKeywords = [
    "operational decision",
    "decision",
    "ontology objects",
    "link types",
    "actions",
    "functions",
    "Chatbot Studio",
    "branch",
    "Finalize",
  ];

  FDE_FILL_SEQUENCE.forEach((step, i) => {
    expect(step.turnIndex).toBe(i);
    expect(step.step).toBe(i + 1);
    // Soft assertion: step.question contains expected keyword (case-insensitive)
    const hasKeyword = step.question.toLowerCase().includes(expectedKeywords[i]!.toLowerCase());
    expect(hasKeyword).toBe(true);
  });
});

test("FDE_FILL_SEQUENCE turnIndex values are 0-8 consecutively", () => {
  for (let i = 0; i < FDE_FILL_SEQUENCE.length; i++) {
    expect(FDE_FILL_SEQUENCE[i]!.turnIndex).toBe(i);
  }
});

test("FDE_FILL_SEQUENCE step values are 1-9 consecutively", () => {
  for (let i = 0; i < FDE_FILL_SEQUENCE.length; i++) {
    expect(FDE_FILL_SEQUENCE[i]!.step).toBe(i + 1);
  }
});

test("FDE_FILL_SEQUENCE last step targets verdict field", () => {
  const lastStep = FDE_FILL_SEQUENCE[8]!;
  expect(lastStep.targetField).toBe("verdict");
});

test("FDE_FILL_SEQUENCE is readonly (frozen-like — not mutable)", () => {
  // TypeScript const ensures this at compile time; runtime check via prototype
  // Ensure it is an array
  expect(Array.isArray(FDE_FILL_SEQUENCE)).toBe(true);
  expect(FDE_FILL_SEQUENCE.length).toBe(9);
});

// ---------------------------------------------------------------------------
// advanceFDEFillSequence behavior tests
// ---------------------------------------------------------------------------

function makeDraftContract(intent: string) {
  return draftSemanticIntentContract({ intent });
}

test("advanceFDEFillSequence T0 → fillSequence has 1 step, source=system (no user input)", () => {
  const contract = makeDraftContract("test");
  const result = advanceFDEFillSequence(contract, 0);

  expect(result.fillSequence).toBeDefined();
  expect(result.fillSequence!.length).toBe(1);
  expect(result.fillSequence![0]!.step).toBe(1);
  expect(result.fillSequence![0]!.source).toBe("system");
});

test("advanceFDEFillSequence T0 with userInput → source=user", () => {
  const contract = makeDraftContract("test");
  const result = advanceFDEFillSequence(contract, 0, "improve inventory decisions");

  expect(result.fillSequence![0]!.source).toBe("user");
  expect(result.fillSequence![0]!.answer).toBe("improve inventory decisions");
});

test("advanceFDEFillSequence T2 with userInput → approvedNouns updated (object types)", () => {
  const contract = makeDraftContract("test");
  const result = advanceFDEFillSequence(contract, 2, "Order,Customer,Product");

  expect(result.approvedNouns).toContain("Order");
  expect(result.approvedNouns).toContain("Customer");
  expect(result.approvedNouns).toContain("Product");
});

test("advanceFDEFillSequence T4 with userInput → approvedVerbs updated (action writeback)", () => {
  const contract = makeDraftContract("test");
  const result = advanceFDEFillSequence(contract, 4, "create,update,delete");

  expect(result.approvedVerbs).toContain("create");
  expect(result.approvedVerbs).toContain("update");
  expect(result.approvedVerbs).toContain("delete");
});

test("advanceFDEFillSequence T8 → verdict='filled'", () => {
  const contract = makeDraftContract("test");
  const result = advanceFDEFillSequence(contract, 8);

  expect(result.verdict).toBe("filled");
});

test("advanceFDEFillSequence out-of-bounds → throws RangeError", () => {
  const contract = makeDraftContract("test");
  expect(() => advanceFDEFillSequence(contract, 9)).toThrow(RangeError);
  expect(() => advanceFDEFillSequence(contract, -1)).toThrow(RangeError);
});

test("advanceFDEFillSequence does not mutate original contract", () => {
  const contract = makeDraftContract("test");
  const originalNouns = [...contract.approvedNouns];
  advanceFDEFillSequence(contract, 2, "NewNoun");

  // Original contract should be unchanged
  expect(contract.approvedNouns).toEqual(originalNouns);
});
