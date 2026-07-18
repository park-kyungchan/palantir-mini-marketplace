// P540 S1: versioned upcaster chain (`src/lineage/upcaster-chain.ts`).
// A1-012 / ADR-006's "versioned upcaster seam" / P230 §4.2 item 1.

import { describe, expect, test } from "bun:test";
import { CURRENT_ENVELOPE_REV, UPCASTER_REGISTRY, type Upcaster, upcastEnvelope } from "../../src/lineage/upcaster-chain";

describe("upcaster-chain: registry is wired (not empty)", () => {
  test("UPCASTER_REGISTRY has at least one real, registered upcaster", () => {
    expect(UPCASTER_REGISTRY.length).toBeGreaterThan(0);
    expect(UPCASTER_REGISTRY[0]!.fromRev).toBe(0);
    expect(UPCASTER_REGISTRY[0]!.toRev).toBe(1);
    expect(CURRENT_ENVELOPE_REV).toBe(1);
  });
});

describe("upcastEnvelope: positive", () => {
  test("a rev-0 row is upcast to CURRENT_ENVELOPE_REV, gaining withWhat.replayCursor", () => {
    const result = upcastEnvelope({ envelopeRev: 0, withWhat: { turnId: "turn-1" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.envelopeRev).toBe(1);
      expect(result.value.withWhat).toEqual({ replayCursor: 0, turnId: "turn-1" });
    }
  });

  test("a row already at CURRENT_ENVELOPE_REV passes through unchanged", () => {
    const result = upcastEnvelope({ envelopeRev: 1, withWhat: { replayCursor: 3, turnId: "turn-2" } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ envelopeRev: 1, withWhat: { replayCursor: 3, turnId: "turn-2" } });
  });

  test("upcast never mutates the source object (returns a new object)", () => {
    const source = { envelopeRev: 0, withWhat: { turnId: "turn-1" } };
    const result = upcastEnvelope(source);
    expect(result.ok).toBe(true);
    expect(source).toEqual({ envelopeRev: 0, withWhat: { turnId: "turn-1" } });
  });

  test("an existing withWhat.replayCursor is never overwritten by the default", () => {
    const result = upcastEnvelope({ envelopeRev: 0, withWhat: { replayCursor: 7 } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.withWhat.replayCursor).toBe(7);
  });
});

describe("upcastEnvelope: fail-loud negative (unregistered rev gap, never thrown)", () => {
  test("an envelopeRev with no registered upcaster path is denied with RC-SCHEMA-VERSION-UNSUPPORTED, not thrown", () => {
    expect(() => upcastEnvelope({ envelopeRev: 99, withWhat: {} })).not.toThrow();
    const result = upcastEnvelope({ envelopeRev: 99, withWhat: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VERSION-UNSUPPORTED");
      expect(result.detail.length).toBeGreaterThan(0);
    }
  });

  test("a row newer than CURRENT_ENVELOPE_REV (downgrade) is denied, not silently accepted", () => {
    const result = upcastEnvelope({ envelopeRev: 5, withWhat: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VERSION-UNSUPPORTED");
  });

  test("a non-advancing custom registry is refused rather than looping forever", () => {
    const nonAdvancing: readonly Upcaster[] = [{ fromRev: 0, toRev: 0, upcast: (e) => e }];
    const result = upcastEnvelope({ envelopeRev: 0, withWhat: {} }, nonAdvancing, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VERSION-UNSUPPORTED");
  });

  test("a multi-step chain applies every registered step, in order", () => {
    const chain: readonly Upcaster[] = [
      { fromRev: 0, toRev: 1, upcast: (e) => ({ ...e, envelopeRev: 1, withWhat: { ...e.withWhat, step: "a" } }) },
      { fromRev: 1, toRev: 2, upcast: (e) => ({ ...e, envelopeRev: 2, withWhat: { ...e.withWhat, step2: "b" } }) },
    ];
    const result = upcastEnvelope({ envelopeRev: 0, withWhat: {} }, chain, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.envelopeRev).toBe(2);
      expect(result.value.withWhat).toEqual({ step: "a", step2: "b" });
    }
  });
});
