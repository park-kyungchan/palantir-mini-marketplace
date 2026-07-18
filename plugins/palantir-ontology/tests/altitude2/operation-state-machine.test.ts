// P440 S1: operation state machine unit tests.

import { describe, expect, test } from "bun:test";
import { OPERATION_STATES, assertLegalTransition, isOperationState } from "../../src/altitude2/operation-state-machine";

describe("isOperationState", () => {
  test("accepts every registered state", () => {
    for (const s of OPERATION_STATES) expect(isOperationState(s)).toBe(true);
  });

  test("rejects an unregistered value", () => {
    expect(isOperationState("SOMETHING_ELSE")).toBe(false);
    expect(isOperationState(42)).toBe(false);
    expect(isOperationState(undefined)).toBe(false);
  });
});

describe("assertLegalTransition: the exact execution-plan.md section 6.3 chain", () => {
  test("walks the full 8-state chain one legal step at a time", () => {
    for (let i = 0; i < OPERATION_STATES.length - 1; i++) {
      const from = OPERATION_STATES[i]!;
      const to = OPERATION_STATES[i + 1]!;
      expect(assertLegalTransition(from, to)).toEqual({ ok: true });
    }
  });

  test("rejects a skip (BOUND_CONSUMER_ONTOLOGY -> PROPOSAL directly)", () => {
    const result = assertLegalTransition("BOUND_CONSUMER_ONTOLOGY", "PROPOSAL");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  test("rejects a backward jump (COMMIT -> DRY_RUN)", () => {
    const result = assertLegalTransition("COMMIT", "DRY_RUN");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  test("rejects any transition out of the terminal state LINEAGE_APPENDED", () => {
    const result = assertLegalTransition("LINEAGE_APPENDED", "READ_OR_QUERY");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  test("rejects an unrecognized \"from\" state with RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = assertLegalTransition("NOT_A_STATE", "READ_OR_QUERY");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("rejects an unrecognized \"to\" state with RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = assertLegalTransition("READ_OR_QUERY", "NOT_A_STATE");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});
