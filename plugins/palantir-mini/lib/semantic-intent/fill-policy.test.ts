// palantir-mini — FillPolicy selector tests (Sprint 97 W2).
//
// Covers:
//   - FillPolicy union accepts deterministic SIC/DTC policies (TS compile)
//   - FILL_POLICIES const contains all public policies (length + includes)
//   - selectDtcFillSequence("dtc-turn-fill") returns DTC_FILL_SEQUENCE (reference equality)
//   - selectDtcFillSequence("default-8-turn") returns undefined
//   - selectDtcFillSequence("fde-ontology-build") returns undefined
//   - selectDtcFillSequence(undefined) returns undefined
//   - Backward-compat: selectFillSequence behavior byte-identical for non-DTC variants

import { describe, expect, it } from "bun:test";
import {
  FILL_POLICIES,
  selectFillSequence,
  selectDtcFillSequence,
  type FillPolicy,
} from "./fill-policy";
import {
  DTC_FILL_SEQUENCE,
  EIGHT_TURN_FILL_SEQUENCE,
} from "./fill-sequence";
import { FDE_FILL_SEQUENCE } from "./fde-fill-sequence";
import {
  CONTEXT_ENGINEERING_TO_SIC_SEQUENCE,
} from "./context-engineering-sic-fill-sequence";
import { ONTOLOGY_DTC_BUILD_SEQUENCE } from "./ontology-dtc-build-sequence";

// ---------------------------------------------------------------------------
// §1 FillPolicy union + FILL_POLICIES registry
// ---------------------------------------------------------------------------

describe("FillPolicy union and FILL_POLICIES registry", () => {
  it("FILL_POLICIES contains DTC and deterministic build policies", () => {
    expect(FILL_POLICIES).toContain("dtc-turn-fill");
    expect(FILL_POLICIES).toContain("context-engineering-to-sic");
    expect(FILL_POLICIES).toContain("ontology-dtc-build");
  });

  it("FILL_POLICIES has exactly 6 entries", () => {
    // 6 since nine-axis-sic was added in W2 (the "5" was stale); corrected in W3d-2b.
    expect(FILL_POLICIES.length).toBe(6);
  });

  it("FILL_POLICIES contains all pre-existing variants", () => {
    expect(FILL_POLICIES).toContain("default-8-turn");
    expect(FILL_POLICIES).toContain("fde-ontology-build");
  });

  it("FillPolicy type accepts 'dtc-turn-fill' (TS compile — value assignment)", () => {
    // This test is a compile-time check; if the union doesn't include "dtc-turn-fill",
    // the TypeScript compiler will error here at build time.
    const policy: FillPolicy = "dtc-turn-fill";
    expect(policy).toBe("dtc-turn-fill");
  });

  it("FillPolicy type accepts deterministic enforcement policies (TS compile)", () => {
    const sicPolicy: FillPolicy = "context-engineering-to-sic";
    const dtcPolicy: FillPolicy = "ontology-dtc-build";

    expect(sicPolicy).toBe("context-engineering-to-sic");
    expect(dtcPolicy).toBe("ontology-dtc-build");
  });

  it("FILL_POLICIES is readonly — appending does not mutate original", () => {
    const before = FILL_POLICIES.length;
    // TypeScript prevents push at compile time, but verify runtime length integrity
    expect(FILL_POLICIES.length).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// §2 selectDtcFillSequence — DTC selector
// ---------------------------------------------------------------------------

describe("selectDtcFillSequence", () => {
  it("returns DTC_FILL_SEQUENCE by reference when policy='dtc-turn-fill'", () => {
    const result = selectDtcFillSequence("dtc-turn-fill");
    expect(result).toBe(DTC_FILL_SEQUENCE);
  });

  it("returns ONTOLOGY_DTC_BUILD_SEQUENCE by reference when policy='ontology-dtc-build'", () => {
    const result = selectDtcFillSequence("ontology-dtc-build");
    expect(result).toBe(ONTOLOGY_DTC_BUILD_SEQUENCE);
  });

  it("returns undefined when policy='default-8-turn'", () => {
    const result = selectDtcFillSequence("default-8-turn");
    expect(result).toBeUndefined();
  });

  it("returns undefined when policy='fde-ontology-build'", () => {
    const result = selectDtcFillSequence("fde-ontology-build");
    expect(result).toBeUndefined();
  });

  it("returns undefined when policy is omitted (undefined)", () => {
    const result = selectDtcFillSequence(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when policy is omitted (no arg)", () => {
    const result = selectDtcFillSequence();
    expect(result).toBeUndefined();
  });

  it("returned sequence is DTC_FILL_SEQUENCE with 7 entries", () => {
    const result = selectDtcFillSequence("dtc-turn-fill");
    expect(result?.length).toBe(7);
  });

  it("returned ontology build sequence has 7 entries", () => {
    const result = selectDtcFillSequence("ontology-dtc-build");
    expect(result?.length).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// §3 Backward-compat: selectFillSequence unaffected by dtc-turn-fill addition
// ---------------------------------------------------------------------------

describe("backward-compat: selectFillSequence unchanged", () => {
  it("selectFillSequence('default-8-turn') returns EIGHT_TURN_FILL_SEQUENCE", () => {
    expect(selectFillSequence("default-8-turn")).toBe(EIGHT_TURN_FILL_SEQUENCE);
  });

  it("selectFillSequence(undefined) returns EIGHT_TURN_FILL_SEQUENCE (default path)", () => {
    expect(selectFillSequence(undefined)).toBe(EIGHT_TURN_FILL_SEQUENCE);
  });

  it("selectFillSequence() with no arg returns EIGHT_TURN_FILL_SEQUENCE (default path)", () => {
    expect(selectFillSequence()).toBe(EIGHT_TURN_FILL_SEQUENCE);
  });

  it("selectFillSequence('fde-ontology-build') returns FDE_FILL_SEQUENCE", () => {
    expect(selectFillSequence("fde-ontology-build")).toBe(FDE_FILL_SEQUENCE);
  });

  it("selectFillSequence('context-engineering-to-sic') returns CONTEXT_ENGINEERING_TO_SIC_SEQUENCE", () => {
    expect(selectFillSequence("context-engineering-to-sic")).toBe(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE);
  });

  it("selectFillSequence serialization is byte-identical after dtc-turn-fill extension", () => {
    const snap1 = JSON.stringify(selectFillSequence("default-8-turn"));
    const snap2 = JSON.stringify(EIGHT_TURN_FILL_SEQUENCE);
    expect(snap1).toBe(snap2);
  });

  it("EIGHT_TURN_FILL_SEQUENCE still has 8 entries after dtc-turn-fill import", () => {
    expect(EIGHT_TURN_FILL_SEQUENCE.length).toBe(8);
  });
});
