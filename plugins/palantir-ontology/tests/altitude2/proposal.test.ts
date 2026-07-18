// P440 S2: proposal (A2-005) unit tests.

import { describe, expect, test } from "bun:test";
import { proposeOperation } from "../../src/altitude2/proposal";
import { baseProposal, boundSession } from "./session-test-helpers";

describe("proposeOperation", () => {
  test("accepts a well-formed typed proposal and advances to PROPOSAL", () => {
    const result = proposeOperation(boundSession("commit"), baseProposal());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("PROPOSAL");
      expect(result.value.proposal).toEqual(baseProposal());
    }
  });

  test("denies a read-only binding with RC-BINDING-SCOPE-INSUFFICIENT (read-only paths stop before proposal)", () => {
    const result = proposeOperation(boundSession("read"), baseProposal());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-BINDING-SCOPE-INSUFFICIENT");
  });

  test("accepts a proposal-scoped binding (its ceiling is exactly PROPOSAL)", () => {
    const result = proposeOperation(boundSession("proposal"), baseProposal());
    expect(result.ok).toBe(true);
  });

  test("denies an empty targetIdentities array with RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = proposeOperation(boundSession("commit"), baseProposal({ targetIdentities: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies a free-text (non-named) targetIdentity", () => {
    const result = proposeOperation(boundSession("commit"), baseProposal({ targetIdentities: ["this has spaces"] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies an empty writeScope", () => {
    const result = proposeOperation(boundSession("commit"), baseProposal({ writeScope: [] }));
    expect(result.ok).toBe(false);
  });

  test("denies a session that has not yet reached READ_OR_QUERY", () => {
    const session = boundSession("commit");
    const result = proposeOperation({ ...session, state: "BOUND_CONSUMER_ONTOLOGY" }, baseProposal());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});
