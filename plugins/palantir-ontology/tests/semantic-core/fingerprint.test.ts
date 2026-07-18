// P410 S1: fingerprint determinism + shape unit tests (validation-contract
// item 3: "identical body -> identical fingerprint (determinism test);
// tampered body -> mismatch rejection (negative test)").

import { describe, expect, test } from "bun:test";
import { FINGERPRINT_PATTERN, fingerprintBody, isFingerprintShaped } from "../../src/semantic-core/fingerprint";

describe("fingerprintBody", () => {
  test("produces a 64-char lowercase-hex string matching the contracts/*.contract.json fingerprint pattern", () => {
    const fp = fingerprintBody({ sicId: "s1", approvedMeaning: "x" });
    expect(fp).toMatch(FINGERPRINT_PATTERN);
    expect(fp.length).toBe(64);
  });

  test("determinism: identical body produces identical fingerprint across repeated calls", () => {
    const body = { dtcId: "d1", dataContext: "orders table", logicContext: "totals", actionContext: "submit" };
    expect(fingerprintBody(body)).toBe(fingerprintBody(body));
  });

  test("determinism: key-insertion order does not affect the fingerprint", () => {
    const a = { sicId: "s1", fdeSessionId: "f1", approvedMeaning: "x" };
    const b = { approvedMeaning: "x", sicId: "s1", fdeSessionId: "f1" };
    expect(fingerprintBody(a)).toBe(fingerprintBody(b));
  });

  test("tampered body: a single changed field produces a different fingerprint (mismatch rejection precondition)", () => {
    const original = { sicId: "s1", approvedMeaning: "Model X as an ObjectType" };
    const tampered = { sicId: "s1", approvedMeaning: "Model X as a ControlPlaneNodeKind entry" };
    expect(fingerprintBody(original)).not.toBe(fingerprintBody(tampered));
  });
});

describe("isFingerprintShaped", () => {
  test("accepts a real fingerprint", () => {
    expect(isFingerprintShaped(fingerprintBody({ x: 1 }))).toBe(true);
  });

  test("rejects a malformed/forged-looking string", () => {
    expect(isFingerprintShaped("not-a-sha256-hash")).toBe(false);
    expect(isFingerprintShaped("ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456")).toBe(false); // uppercase
    expect(isFingerprintShaped("a".repeat(63))).toBe(false); // too short
    expect(isFingerprintShaped("a".repeat(65))).toBe(false); // too long
    expect(isFingerprintShaped(123)).toBe(false);
  });
});
