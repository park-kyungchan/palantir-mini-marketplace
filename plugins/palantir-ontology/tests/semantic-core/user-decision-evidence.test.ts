// P410 S1: independently-verified user-decision evidence unit tests
// (mission bullet: "Independent user-decision evidence is a required,
// typed input for approval transitions (never derived from the proposing
// actor)").

import { describe, expect, test } from "bun:test";
import { isIndependentEvidence, isUserDecisionEvidence } from "../../src/semantic-core/user-decision-evidence";

const VALID_EVIDENCE = {
  evidenceRef: "evidence:decision-log-2026-07-18-001",
  verifiedAt: "2026-07-18T09:25:00Z",
  verifiedBy: { identity: "user:packr0723", role: "approver" },
};

describe("isUserDecisionEvidence", () => {
  test("accepts a well-formed evidence object", () => {
    expect(isUserDecisionEvidence(VALID_EVIDENCE)).toBe(true);
  });

  test("rejects missing evidenceRef", () => {
    const { evidenceRef, ...rest } = VALID_EVIDENCE;
    expect(isUserDecisionEvidence(rest)).toBe(false);
  });

  test("rejects missing verifiedBy.identity", () => {
    expect(isUserDecisionEvidence({ ...VALID_EVIDENCE, verifiedBy: { role: "approver" } })).toBe(false);
  });

  test("rejects a bare tool-success boolean standing in for evidence", () => {
    expect(isUserDecisionEvidence(true)).toBe(false);
  });

  test("rejects a free-text string standing in for a typed evidence object", () => {
    expect(isUserDecisionEvidence("the user said yes")).toBe(false);
  });

  test("rejects null and undefined", () => {
    expect(isUserDecisionEvidence(null)).toBe(false);
    expect(isUserDecisionEvidence(undefined)).toBe(false);
  });
});

describe("isIndependentEvidence", () => {
  test("true when the verifying identity differs from the proposing actor", () => {
    expect(isIndependentEvidence(VALID_EVIDENCE, "agent:claude-sonnet-5")).toBe(true);
  });

  test("false when evidence is self-attested by the proposing actor (never derived from the proposing actor)", () => {
    const selfAttested = { ...VALID_EVIDENCE, verifiedBy: { identity: "agent:claude-sonnet-5" } };
    expect(isIndependentEvidence(selfAttested, "agent:claude-sonnet-5")).toBe(false);
  });
});
