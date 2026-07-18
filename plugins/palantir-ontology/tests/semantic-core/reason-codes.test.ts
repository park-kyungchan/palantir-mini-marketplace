// P410 S1: reason-code binding unit tests.

import { describe, expect, test } from "bun:test";
import {
  getReasonCodeEntry,
  isRegisteredReasonCode,
  RC_SCHEMA_VALIDATION_FAILED,
  RC_STATE_EVIDENCE_MISSING,
  RC_STATE_SKIPPED_TRANSITION,
  RC_STATE_STALE_FINGERPRINT,
  reasonCodeAppliesTo,
} from "../../src/semantic-core/reason-codes";

describe("isRegisteredReasonCode", () => {
  test("accepts every code this module names by literal reference", () => {
    for (const code of [RC_STATE_SKIPPED_TRANSITION, RC_STATE_EVIDENCE_MISSING, RC_STATE_STALE_FINGERPRINT, RC_SCHEMA_VALIDATION_FAILED]) {
      expect(isRegisteredReasonCode(code)).toBe(true);
    }
  });

  test("rejects a free-text / unregistered string", () => {
    expect(isRegisteredReasonCode("RC-MADE-UP-CODE")).toBe(false);
    expect(isRegisteredReasonCode("evidence was fine, trust me")).toBe(false);
    expect(isRegisteredReasonCode(42)).toBe(false);
  });
});

describe("reasonCodeAppliesTo", () => {
  test("RC-STATE-SKIPPED-TRANSITION applies to all three construction-lane aggregates", () => {
    for (const slug of ["fde-session", "semantic-intent", "digital-twin-change"]) {
      expect(reasonCodeAppliesTo(RC_STATE_SKIPPED_TRANSITION, slug)).toBe(true);
    }
  });

  test("RC-STATE-STALE-FINGERPRINT does not apply to fde-session (no fingerprint field there)", () => {
    expect(reasonCodeAppliesTo(RC_STATE_STALE_FINGERPRINT, "fde-session")).toBe(false);
    expect(reasonCodeAppliesTo(RC_STATE_STALE_FINGERPRINT, "semantic-intent")).toBe(true);
  });

  test("an unregistered code applies to nothing", () => {
    expect(reasonCodeAppliesTo("RC-NOT-REAL", "fde-session")).toBe(false);
  });
});

describe("getReasonCodeEntry", () => {
  test("returns the full entry for a registered code", () => {
    const entry = getReasonCodeEntry(RC_STATE_EVIDENCE_MISSING);
    expect(entry?.owner).toBe("governance");
    expect(entry?.retryable).toBe(true);
  });

  test("returns undefined for an unregistered code", () => {
    expect(getReasonCodeEntry("RC-NOT-REAL")).toBeUndefined();
  });
});
