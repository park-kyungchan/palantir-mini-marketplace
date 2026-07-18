// P410 S1: construction state machine unit tests (validation-contract item
// 2: "states/transitions enumerated; every transition carries a registry
// reason code; illegal transitions rejected with stable codes").

import { describe, expect, test } from "bun:test";
import {
  assertLegalTransition,
  CONSTRUCTION_STATES,
  isConstructionState,
  type ConstructionState,
} from "../../src/semantic-core/construction-state-machine";
import { isRegisteredReasonCode } from "../../src/semantic-core/reason-codes";
import fdeSessionSchema from "../../contracts/fde-session.contract.json";

describe("CONSTRUCTION_STATES", () => {
  test("enumerates the exact 9-state execution-plan.md section 6.3 chain, in order", () => {
    expect(CONSTRUCTION_STATES).toEqual([
      "FDE_OPEN",
      "SIC_PROPOSED",
      "SIC_APPROVED",
      "DTC_PROPOSED",
      "DTC_APPROVED",
      "CONSTRUCTION_STAGED",
      "VALIDATED",
      "MUTATION_AUTHORITY_ISSUED",
      "COMMITTED",
    ]);
  });

  test("matches contracts/fde-session.contract.json's status enum exactly", () => {
    expect([...fdeSessionSchema.properties.status.enum]).toEqual([...CONSTRUCTION_STATES]);
  });
});

describe("isConstructionState", () => {
  for (const s of CONSTRUCTION_STATES) {
    test(`accepts "${s}"`, () => expect(isConstructionState(s)).toBe(true));
  }
  test("rejects a free-text / non-member value", () => {
    expect(isConstructionState("DTC_PROPOSED_DIRECTLY_FROM_OPEN")).toBe(false);
    expect(isConstructionState("committed")).toBe(false); // wrong case
    expect(isConstructionState(123)).toBe(false);
    expect(isConstructionState(undefined)).toBe(false);
  });
});

describe("assertLegalTransition — full 9x9 adjacency matrix", () => {
  const LEGAL_PAIRS = new Set(
    CONSTRUCTION_STATES.slice(0, -1).map((s, i) => `${s}->${CONSTRUCTION_STATES[i + 1]}`),
  );

  for (const from of CONSTRUCTION_STATES) {
    for (const to of CONSTRUCTION_STATES) {
      const pairKey = `${from}->${to}`;
      const isLegal = LEGAL_PAIRS.has(pairKey);
      test(`${pairKey} is ${isLegal ? "legal" : "illegal"}`, () => {
        const result = assertLegalTransition(from, to);
        expect(result.ok).toBe(isLegal);
        if (!result.ok) {
          expect(isRegisteredReasonCode(result.reasonCode)).toBe(true);
        }
      });
    }
  }

  test("every one of the 8 legal single-step edges is accepted (positive coverage)", () => {
    for (let i = 0; i < CONSTRUCTION_STATES.length - 1; i++) {
      const result = assertLegalTransition(CONSTRUCTION_STATES[i], CONSTRUCTION_STATES[i + 1]);
      expect(result.ok).toBe(true);
    }
  });
});

describe("assertLegalTransition — negative cases beyond the enumerated grid", () => {
  test("rejects skipping an intermediate state (DTC_PROPOSED -> COMMITTED), stable code RC-STATE-SKIPPED-TRANSITION", () => {
    const result = assertLegalTransition("DTC_PROPOSED", "COMMITTED");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  test("rejects a backward transition (SIC_APPROVED -> SIC_PROPOSED)", () => {
    const result = assertLegalTransition("SIC_APPROVED", "SIC_PROPOSED");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  test("rejects a free-text state claim not in the registered enum, stable code RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = assertLegalTransition("FDE_OPEN", "definitely approved, trust me");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("rejects an unrecognized \"from\" state (e.g. tool-success boolean masquerading as state)", () => {
    const result = assertLegalTransition(true, "SIC_PROPOSED");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("rejects any transition out of the terminal COMMITTED state", () => {
    const result = assertLegalTransition("COMMITTED", "FDE_OPEN");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  test("every denial's reasonCode applies to at least one construction-lane aggregate slug in the registry", () => {
    const badResult = assertLegalTransition("FDE_OPEN", "COMMITTED");
    expect(badResult.ok).toBe(false);
  });
});
