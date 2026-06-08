// Tests: fill-policy.ts selectFillSequence and FILL_POLICIES registry.
// Validates: absent/default-8-turn → EIGHT_TURN_FILL_SEQUENCE; explicit deterministic policies route by contract.

import { test, expect } from "bun:test";
import {
  selectFillSequence,
  FILL_POLICIES,
} from "../../../lib/semantic-intent/fill-policy";
import { EIGHT_TURN_FILL_SEQUENCE } from "../../../lib/semantic-intent/fill-sequence";
import { FDE_FILL_SEQUENCE } from "../../../lib/semantic-intent/fde-fill-sequence";
import {
  CONTEXT_ENGINEERING_TO_SIC_SEQUENCE,
} from "../../../lib/semantic-intent/context-engineering-sic-fill-sequence";

// ---------------------------------------------------------------------------
// selectFillSequence policy routing tests
// ---------------------------------------------------------------------------

test("selectFillSequence(undefined) returns EIGHT_TURN_FILL_SEQUENCE (reference equality)", () => {
  expect(selectFillSequence(undefined)).toBe(EIGHT_TURN_FILL_SEQUENCE);
});

test("selectFillSequence('default-8-turn') returns EIGHT_TURN_FILL_SEQUENCE (reference equality)", () => {
  expect(selectFillSequence("default-8-turn")).toBe(EIGHT_TURN_FILL_SEQUENCE);
});

test("selectFillSequence('fde-ontology-build') returns FDE_FILL_SEQUENCE (reference equality)", () => {
  expect(selectFillSequence("fde-ontology-build")).toBe(FDE_FILL_SEQUENCE);
});

test("selectFillSequence('context-engineering-to-sic') returns CONTEXT_ENGINEERING_TO_SIC_SEQUENCE (reference equality)", () => {
  expect(selectFillSequence("context-engineering-to-sic")).toBe(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE);
});

test("selectFillSequence default path returns 8-step sequence", () => {
  const seq = selectFillSequence(undefined);
  expect(seq.length).toBe(8);
});

test("selectFillSequence fde path returns 9-step sequence", () => {
  const seq = selectFillSequence("fde-ontology-build");
  expect(seq.length).toBe(9);
});

// ---------------------------------------------------------------------------
// FILL_POLICIES registry tests
// ---------------------------------------------------------------------------

test("FILL_POLICIES contains 'default-8-turn'", () => {
  expect(FILL_POLICIES).toContain("default-8-turn");
});

test("FILL_POLICIES contains 'fde-ontology-build'", () => {
  expect(FILL_POLICIES).toContain("fde-ontology-build");
});

test("FILL_POLICIES contains 'dtc-turn-fill'", () => {
  expect(FILL_POLICIES).toContain("dtc-turn-fill");
});

test("FILL_POLICIES contains deterministic SIC/DTC policies", () => {
  expect(FILL_POLICIES).toContain("context-engineering-to-sic");
  expect(FILL_POLICIES).toContain("ontology-dtc-build");
});

test("FILL_POLICIES has exactly 6 entries", () => {
  // 6 since nine-axis-sic was added in W2 (the "5" was stale); corrected in W3d-2b.
  expect(FILL_POLICIES.length).toBe(6);
});

test("FILL_POLICIES first entry is 'default-8-turn' (stable ordering)", () => {
  expect(FILL_POLICIES[0]).toBe("default-8-turn");
});

test("FILL_POLICIES second entry is 'fde-ontology-build' (stable ordering)", () => {
  expect(FILL_POLICIES[1]).toBe("fde-ontology-build");
});

test("FILL_POLICIES third entry is 'dtc-turn-fill' (stable ordering)", () => {
  expect(FILL_POLICIES[2]).toBe("dtc-turn-fill");
});

test("FILL_POLICIES fourth and fifth entries are deterministic build policies (stable ordering)", () => {
  expect(FILL_POLICIES[3]).toBe("context-engineering-to-sic");
  expect(FILL_POLICIES[4]).toBe("ontology-dtc-build");
});

// ---------------------------------------------------------------------------
// Critical invariant: EIGHT_TURN_FILL_SEQUENCE is returned by default
// This validates the "fillPolicy absent → byte-identical" contract.
// ---------------------------------------------------------------------------

test("selectFillSequence default path sequence is EIGHT_TURN_FILL_SEQUENCE (8 steps, T0-T7)", () => {
  const seq = selectFillSequence();
  expect(seq.length).toBe(8);
  // Verify step ordinals are 1-8
  for (let i = 0; i < seq.length; i++) {
    expect(seq[i]!.turnIndex).toBe(i);
    expect(seq[i]!.step).toBe(i + 1);
  }
});
