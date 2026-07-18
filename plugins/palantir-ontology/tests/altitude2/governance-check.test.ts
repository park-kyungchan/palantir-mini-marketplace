// P440 S2: governance check (A2-006) unit tests.

import { describe, expect, test } from "bun:test";
import { proposeOperation } from "../../src/altitude2/proposal";
import { performDryRun } from "../../src/altitude2/dry-run";
import { runGovernanceCheck } from "../../src/altitude2/governance-check";
import { baseProposal, boundSession } from "./session-test-helpers";

function dryRunSession() {
  const proposed = proposeOperation(boundSession("commit"), baseProposal());
  if (!proposed.ok) throw new Error("fixture setup failed");
  const dryRun = performDryRun(proposed.value);
  if (!dryRun.ok) throw new Error("fixture setup failed");
  return dryRun.value;
}

describe("runGovernanceCheck", () => {
  test("collects submissionCriteriaResult and permissionDecisionRef as two separate fields and advances to GOVERNANCE_CHECK", () => {
    const result = runGovernanceCheck(dryRunSession(), {
      evaluateSubmissionCriteria: () => ({ passed: true, evaluatedAt: "2026-07-18T09:00:30Z" }),
      permissionDecisionRef: () => "rbac:l2:allow:2026-07-18T09:00:30Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("GOVERNANCE_CHECK");
      expect(result.value.submissionCriteriaResult).toEqual({ passed: true, evaluatedAt: "2026-07-18T09:00:30Z" });
      expect(result.value.permissionDecisionRef).toBe("rbac:l2:allow:2026-07-18T09:00:30Z");
    }
  });

  test("records a FAILED submission criteria result without conflating it with permission (A2-006 separation)", () => {
    const result = runGovernanceCheck(dryRunSession(), {
      evaluateSubmissionCriteria: () => ({ passed: false, evaluatedAt: "2026-07-18T09:00:30Z", detail: "reviewer sign-off missing" }),
      permissionDecisionRef: () => "rbac:l2:allow:2026-07-18T09:00:30Z",
    });
    // This step only COLLECTS the two independent facts; it does not itself
    // deny on failed criteria — that denial belongs to the single commit
    // gate (RC-AUTH-SUBMISSION-CRITERIA-FAILED), routed to in commit-routing.ts.
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.submissionCriteriaResult?.passed).toBe(false);
  });

  test("denies an empty permissionDecisionRef with RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = runGovernanceCheck(dryRunSession(), {
      evaluateSubmissionCriteria: () => ({ passed: true, evaluatedAt: "2026-07-18T09:00:30Z" }),
      permissionDecisionRef: () => "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies a session with no dryRunFingerprint attached", () => {
    const result = runGovernanceCheck(boundSession("commit"), {
      evaluateSubmissionCriteria: () => ({ passed: true, evaluatedAt: "2026-07-18T09:00:30Z" }),
      permissionDecisionRef: () => "rbac:l2:allow",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies a proposal-scoped binding with RC-BINDING-SCOPE-INSUFFICIENT (defense-in-depth: a session cannot naturally reach here via the pipeline since performDryRun already blocks it, per dry-run.test.ts)", () => {
    const session = dryRunSession();
    const proposalScoped = { ...session, binding: { ...session.binding, bindingScope: "proposal" as const } };
    const result = runGovernanceCheck(proposalScoped, {
      evaluateSubmissionCriteria: () => ({ passed: true, evaluatedAt: "2026-07-18T09:00:30Z" }),
      permissionDecisionRef: () => "rbac:l2:allow",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-BINDING-SCOPE-INSUFFICIENT");
  });
});
