import { describe, expect, test } from "bun:test";
import {
  isApprovedSemanticIntentContract,
  semanticIntentContractRefFromApproved,
} from "../../../lib/semantic-intent/approved-contract";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";

function semantic(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved-shape",
    status: "approved",
    rawIntent: "Build context engineering plan",
    confirmedIntent: "Build context engineering plan from approved meaning.",
    nonGoals: [],
    approvedNouns: ["ContextEngineeringPlan"],
    approvedVerbs: ["build"],
    affectedSurfaces: ["lib/context-engineering/context-plan-builder.ts"],
    permissionsAndProposal: "plugin-local test",
    acceptedRisks: [],
    downstreamAllowed: ["draft DTC"],
    downstreamForbidden: ["unapproved writeback"],
    clarificationQuestions: [],
    approvalRef: "user:approved:context-plan",
    ...overrides,
  };
}

describe("approved SemanticIntentContract shape", () => {
  test("requires status=approved, approvalRef, and contractId", () => {
    expect(isApprovedSemanticIntentContract(semantic())).toBe(true);
    expect(isApprovedSemanticIntentContract(semantic({ status: "draft" }))).toBe(false);
    expect(isApprovedSemanticIntentContract(semantic({ approvalRef: undefined }))).toBe(false);
    expect(isApprovedSemanticIntentContract(semantic({ contractId: "" }))).toBe(false);
  });

  test("uses contractId as the semanticIntentContractRef", () => {
    expect(semanticIntentContractRefFromApproved(semantic())).toBe(
      "semantic-intent:approved-shape",
    );
    expect(() => semanticIntentContractRefFromApproved(semantic({ approvalRef: undefined })))
      .toThrow(/contractId and approvalRef/);
  });
});
