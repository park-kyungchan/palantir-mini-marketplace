import { describe, expect, test } from "bun:test";
import {
  WORKFLOW_FAMILIES,
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
  WORKFLOW_FAMILY_RELEASE_GATE_REQUIRED_EVIDENCE_REFS,
  type WorkflowFamilyEnforcementContract,
} from "../../core/contracts/workflow-family-enforcement";
import {
  evaluateWorkflowFamilyReleaseGate,
} from "../../lib/release/workflow-family-release-gate";

describe("workflow family release gate", () => {
  test("passes when registry aggregates deterministic evidence from prior PR slices", () => {
    const result = evaluateWorkflowFamilyReleaseGate();

    expect(result.schemaVersion).toBe("palantir-mini/workflow-family-release-gate/v1");
    expect(result.status).toBe("pass");
    expect(result.releaseBlocking).toBe(true);
    expect(result.reasonCodes).toEqual(["workflow_family_release_gate_pass"]);
    expect(result.requiredEvidenceRefs).toEqual(
      WORKFLOW_FAMILY_RELEASE_GATE_REQUIRED_EVIDENCE_REFS,
    );
    expect(result.metrics.workflowFamilyCount).toBe(WORKFLOW_FAMILIES.length);
    expect(result.metrics.enforcedBlockingPhaseCount).toBeGreaterThan(0);
    expect(result.metrics.replayEvalCount).toBeGreaterThan(0);
  });

  test("fails when required release evidence is not present in the release contract", () => {
    const contracts = WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY.map((contract) =>
      contract.workflowFamily !== "releaseAndShipping"
        ? contract
        : {
            ...contract,
            enforcement: {
              ...contract.enforcement,
              releaseGates: contract.enforcement.releaseGates.map((gate) =>
                gate.gateId !== "release-gate:workflow-family-final-aggregator"
                  ? gate
                  : { ...gate, requiredEvidenceRefs: ["tests/governance/effective-gate-mode.test.ts"] }
              ),
            },
          }
    ) satisfies readonly WorkflowFamilyEnforcementContract[];

    const result = evaluateWorkflowFamilyReleaseGate({ contracts });

    expect(result.status).toBe("fail");
    expect(result.reasonCodes).toContain(
      "workflow_family_release_gate_contract_missing_evidence",
    );
    expect(result.findings.some((finding) =>
      finding.ref === "tests/lib/chatbot-studio/semantic-conversation-state.test.ts"
    )).toBe(true);
  });

  test("fails when a blocking workflow phase is not deterministic", () => {
    const contracts = WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY.map((contract) =>
      contract.workflowFamily !== "semanticIntentAndRouting"
        ? contract
        : {
            ...contract,
            phases: contract.phases.map((phase, index) =>
              index === 0 ? { ...phase, deterministicStatus: "advisory-only" as const } : phase
            ),
          }
    ) satisfies readonly WorkflowFamilyEnforcementContract[];

    const result = evaluateWorkflowFamilyReleaseGate({ contracts });

    expect(result.status).toBe("fail");
    expect(result.reasonCodes).toContain("workflow_family_blocking_gate_not_enforced");
    expect(result.findings.some((finding) =>
      finding.workflowFamily === "semanticIntentAndRouting"
    )).toBe(true);
  });

  test("fails when release-blocking self-check wiring is removed", () => {
    const contracts = WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY.map((contract) =>
      contract.workflowFamily !== "releaseAndShipping"
        ? contract
        : {
            ...contract,
            enforcement: {
              ...contract.enforcement,
              selfChecks: contract.enforcement.selfChecks.filter((check) =>
                check.checkId !== "self-check:workflow-family-release-gate"
              ),
            },
          }
    ) satisfies readonly WorkflowFamilyEnforcementContract[];

    const result = evaluateWorkflowFamilyReleaseGate({ contracts });

    expect(result.status).toBe("fail");
    expect(result.reasonCodes).toContain(
      "workflow_family_release_blocking_self_check_missing",
    );
  });
});
