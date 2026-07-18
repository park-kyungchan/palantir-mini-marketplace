// P540 S1/S3: the event-reader seam (`src/lineage/event-reader.ts`) --
// mission bullet 1 (reader ALWAYS upcasts) + bullet 3 (malformed events
// quarantined, never crash, never silently dropped).

import { describe, expect, test } from "bun:test";
import * as EventReaderModule from "../../src/lineage/event-reader";
import { readEvents } from "../../src/lineage/event-reader";

const VALID_REV0_ROW = {
  schemaVersion: "1.0.0",
  envelopeRev: 0,
  type: "fde_turn_recorded",
  when: "2026-07-18T09:05:00Z",
  atopWhich: "fde-session:fde-sess-0002",
  throughWhich: "src/altitude1/turn-engine.ts",
  byWhom: { identity: "agent:claude-sonnet-5", role: "worker" },
  withWhat: { turnId: "turn-1" },
};

describe("readEvents: reader-invoked upcasting is structurally impossible to bypass", () => {
  test("the module exports exactly one read entrypoint (readEvents) -- no raw/skip-upcast export exists", () => {
    const exportNames = Object.keys(EventReaderModule).sort();
    expect(exportNames).toEqual(["readEvents"]);
  });

  test("a well-formed rev-0 row is NEVER returned at its original rev -- it is always upcast to CURRENT_ENVELOPE_REV before appearing in `envelopes`", () => {
    const { envelopes, quarantined } = readEvents([VALID_REV0_ROW]);
    expect(quarantined).toEqual([]);
    expect(envelopes.length).toBe(1);
    expect(envelopes[0]!.envelope.envelopeRev).toBe(1);
    expect(envelopes[0]!.envelope.withWhat).toEqual({ replayCursor: 0, turnId: "turn-1" });
  });

  test("sequence is assigned densely (0, 1, 2, ...) over the successfully-read stream only", () => {
    const { envelopes } = readEvents([VALID_REV0_ROW, VALID_REV0_ROW, VALID_REV0_ROW]);
    expect(envelopes.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });
});

describe("readEvents: malformed-event quarantine (never crash, never silently dropped)", () => {
  test("a structurally malformed row (missing byWhom) is quarantined with RC-SCHEMA-VALIDATION-FAILED, not thrown, not included in envelopes", () => {
    const malformed = { ...VALID_REV0_ROW, byWhom: undefined };
    expect(() => readEvents([malformed])).not.toThrow();
    const { envelopes, quarantined } = readEvents([malformed]);
    expect(envelopes).toEqual([]);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]!.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(quarantined[0]!.raw).toEqual(malformed);
  });

  test("a row with an unregistered envelopeRev gap is quarantined with RC-SCHEMA-VERSION-UNSUPPORTED, not thrown", () => {
    const ungradeable = { ...VALID_REV0_ROW, envelopeRev: 99 };
    const { envelopes, quarantined } = readEvents([ungradeable]);
    expect(envelopes).toEqual([]);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]!.reasonCode).toBe("RC-SCHEMA-VERSION-UNSUPPORTED");
  });

  test("a non-object row (null) is quarantined, never crashes the whole read", () => {
    expect(() => readEvents([null, VALID_REV0_ROW])).not.toThrow();
    const { envelopes, quarantined } = readEvents([null, VALID_REV0_ROW]);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]!.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(quarantined[0]!.rawIndex).toBe(0);
    expect(envelopes.length).toBe(1);
    expect(envelopes[0]!.sequence).toBe(0); // sequence is dense over the surviving stream, not the raw index
  });

  test("one malformed row among several never poisons the others -- good rows still read and upcast", () => {
    const malformed = { ...VALID_REV0_ROW, byWhom: undefined };
    const { envelopes, quarantined } = readEvents([VALID_REV0_ROW, malformed, VALID_REV0_ROW]);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]!.rawIndex).toBe(1);
    expect(envelopes.length).toBe(2);
    expect(envelopes.map((e) => e.sequence)).toEqual([0, 1]);
    expect(envelopes.every((e) => e.envelope.envelopeRev === 1)).toBe(true);
  });

  test("an enum-invalid nested field (withWhat.memoryLayers) is quarantined via the real contract schema, not a hand-picked field list", () => {
    const invalidEnum = { ...VALID_REV0_ROW, withWhat: { memoryLayers: ["long-term"] } };
    const { quarantined } = readEvents([invalidEnum]);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]!.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});
