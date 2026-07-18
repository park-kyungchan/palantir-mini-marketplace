// P440 S2: dry-run fingerprint (A2-005) unit tests.

import { describe, expect, test } from "bun:test";
import { proposeOperation } from "../../src/altitude2/proposal";
import { performDryRun } from "../../src/altitude2/dry-run";
import { FINGERPRINT_PATTERN } from "../../src/semantic-core/fingerprint";
import { baseProposal, boundSession } from "./session-test-helpers";

describe("performDryRun", () => {
  test("computes a well-formed sha256-hex fingerprint and advances to DRY_RUN", () => {
    const proposed = proposeOperation(boundSession("commit"), baseProposal());
    if (!proposed.ok) throw new Error("fixture setup failed");
    const result = performDryRun(proposed.value);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("DRY_RUN");
      expect(result.value.dryRunFingerprint).toMatch(FINGERPRINT_PATTERN);
    }
  });

  test("is deterministic: the same proposal body always fingerprints identically", () => {
    const a = proposeOperation(boundSession("commit"), baseProposal());
    const b = proposeOperation(boundSession("commit"), baseProposal());
    if (!a.ok || !b.ok) throw new Error("fixture setup failed");
    const dryA = performDryRun(a.value);
    const dryB = performDryRun(b.value);
    if (!dryA.ok || !dryB.ok) throw new Error("dry-run failed");
    expect(dryA.value.dryRunFingerprint).toBe(dryB.value.dryRunFingerprint);
  });

  test("a different proposal body fingerprints differently", () => {
    const a = proposeOperation(boundSession("commit"), baseProposal());
    const b = proposeOperation(boundSession("commit"), baseProposal({ allowedAction: "delete-object-type" }));
    if (!a.ok || !b.ok) throw new Error("fixture setup failed");
    const dryA = performDryRun(a.value);
    const dryB = performDryRun(b.value);
    if (!dryA.ok || !dryB.ok) throw new Error("dry-run failed");
    expect(dryA.value.dryRunFingerprint).not.toBe(dryB.value.dryRunFingerprint);
  });

  test("denies a session with no proposal attached", () => {
    const result = performDryRun(boundSession("commit"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies a proposal-scoped binding with RC-BINDING-SCOPE-INSUFFICIENT (proposal ceiling stops before dry-run)", () => {
    const proposed = proposeOperation(boundSession("proposal"), baseProposal());
    if (!proposed.ok) throw new Error("fixture setup failed");
    const result = performDryRun(proposed.value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-BINDING-SCOPE-INSUFFICIENT");
  });
});
