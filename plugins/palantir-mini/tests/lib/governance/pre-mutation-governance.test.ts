import { describe, test, expect } from "bun:test";
import {
  preMutationGovernance,
  type PreMutationGovernanceDecision,
} from "../../../lib/governance/pre-mutation-governance";

describe("PreMutationGovernanceDecision.refs.dtcFillSequenceStep", () => {
  const baseInput = {
    toolName: "Edit",
    targetFiles: ["/x/y.ts"],
    allowed: true,
    reason: "default-allow",
  };

  test("dtcFillSequenceStep field absent when not provided (backward compat)", () => {
    const decision = preMutationGovernance(baseInput);
    // The field is optional — absence is valid (undefined)
    expect(decision.refs.dtcFillSequenceStep).toBeUndefined();
  });

  test("existing refs fields preserved verbatim (backward compat)", () => {
    const decision = preMutationGovernance(baseInput);
    // All pre-existing ref fields must remain intact
    expect("semanticIntentContractRef" in decision.refs).toBe(true);
    expect("digitalTwinChangeContractRef" in decision.refs).toBe(true);
    expect("approvalRef" in decision.refs).toBe(true);
    expect("universalOntologyEntryRef" in decision.refs).toBe(true);
    expect("ontologyContextQueryRef" in decision.refs).toBe(true);
  });

  test("dtcFillSequenceStep accepts 0 (first turn)", () => {
    // Build a decision manually to verify the interface accepts step=0
    const decision: PreMutationGovernanceDecision = {
      schemaVersion: "palantir-mini/pre-mutation-governance/v1",
      decisionId: "pre-mutation-governance:test",
      createdAt: "2026-05-15T00:00:00.000Z",
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      allowed: false,
      reason: "DTC fill incomplete at turn 0 of 7",
      refs: {
        dtcFillSequenceStep: 0,
      },
    };
    expect(decision.refs.dtcFillSequenceStep).toBe(0);
  });

  test("dtcFillSequenceStep accepts 6 (last turn)", () => {
    const decision: PreMutationGovernanceDecision = {
      schemaVersion: "palantir-mini/pre-mutation-governance/v1",
      decisionId: "pre-mutation-governance:test",
      createdAt: "2026-05-15T00:00:00.000Z",
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      allowed: false,
      reason: "DTC fill incomplete at turn 6 of 7",
      refs: {
        dtcFillSequenceStep: 6,
      },
    };
    expect(decision.refs.dtcFillSequenceStep).toBe(6);
  });

  test("dtcFillSequenceStep accepts -1 (N/A sentinel)", () => {
    const decision: PreMutationGovernanceDecision = {
      schemaVersion: "palantir-mini/pre-mutation-governance/v1",
      decisionId: "pre-mutation-governance:test",
      createdAt: "2026-05-15T00:00:00.000Z",
      toolName: "Edit",
      targetFiles: ["/x/y.ts"],
      allowed: true,
      reason: "all rules passed (no fill sequence)",
      refs: {
        dtcFillSequenceStep: -1,
      },
    };
    expect(decision.refs.dtcFillSequenceStep).toBe(-1);
  });

  test("schemaVersion and decisionId are set by preMutationGovernance", () => {
    const decision = preMutationGovernance(baseInput);
    expect(decision.schemaVersion).toBe("palantir-mini/pre-mutation-governance/v1");
    expect(decision.decisionId).toMatch(/^pre-mutation-governance:/);
  });
});
