import { describe, expect, test } from "bun:test";
import { evaluateFDEGovernancePolicy } from "../../../lib/governance/fde-governance-policy";
import type { DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";

const APPROVED_DTC: DigitalTwinChangeContract = {
  contractId: "dtc://approved",
  status: "approved",
  semanticIntentContractRef: "sic://approved",
  affectedSurfaces: ["lib/governance"],
  changeBoundary: "Plugin governance policy.",
  branchProposalPolicy: "normal PR",
  permissionBoundary: "plugin local",
  replayMigrationPlan: "none",
  observabilityPlan: "emit policy decision",
  toolSurfaceReadiness: "Claude and Codex MCP spellings",
  evaluationPlan: "targeted tests",
  risks: [],
  approvalRef: "user:approved:test",
};

describe("evaluateFDEGovernancePolicy", () => {
  test("allows read-only FDE inspection without DTC", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "mcp__palantir_mini__ontology_schema_get",
      targetFiles: [],
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("read-only-allow");
  });

  test("blocks protected mutation without approved DTC", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "mcp__palantir_mini__commit_edits",
      targetFiles: [],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing-digital-twin-change-contract");
  });

  test("blocks protected mutation when human approval is absent", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "mcp__palantir_mini__commit_edits",
      targetFiles: [],
      isProtectedMutation: true,
      dtc: { ...APPROVED_DTC, approvalRef: undefined },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("human-approval-required");
  });

  test("blocks open required DTC decision", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "mcp__palantir_mini__commit_edits",
      targetFiles: [],
      isProtectedMutation: true,
      dtc: {
        ...APPROVED_DTC,
        requiredUserDecisions: [{
          decisionId: "decision-1",
          domain: "GOVERNANCE",
          label: "Approve publishing boundary",
          status: "open",
          blocking: true,
          evidenceRefs: [],
        }],
      },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("required-decision-open");
  });

  test("allows protected mutation after DTC approval, decision closure, and no open risks", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "mcp__palantir_mini__commit_edits",
      targetFiles: [],
      isProtectedMutation: true,
      dtc: {
        ...APPROVED_DTC,
        requiredUserDecisions: [{
          decisionId: "decision-1",
          domain: "GOVERNANCE",
          label: "Approve publishing boundary",
          status: "approved",
          blocking: true,
          evidenceRefs: ["test://decision"],
          approvalRef: "user:approved:decision",
        }],
      },
    });
    expect(result.allowed).toBe(true);
  });

  test("blocks protected mutation when implied data review domain is not closed", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "Edit",
      targetFiles: ["data/customer-context.ts"],
      dtc: { ...APPROVED_DTC, affectedSurfaces: ["data/"] },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("required-review-domain-open");
    expect(result.humanReason).toContain("DATA");
  });

  test("requires technology and governance review closure for lib/governance targets", () => {
    const result = evaluateFDEGovernancePolicy({
      toolName: "Edit",
      targetFiles: ["lib/governance/policy-compiler.ts"],
      isProtectedMutation: true,
      dtc: {
        ...APPROVED_DTC,
        affectedSurfaces: ["lib/governance"],
        requiredUserDecisions: [{
          decisionId: "decision-tech",
          domain: "TECHNOLOGY",
          label: "Technology review",
          status: "accepted-risk",
          blocking: true,
          evidenceRefs: ["test://tech"],
          acceptedRiskRef: "user:risk:tech",
        }, {
          decisionId: "decision-gov",
          domain: "GOVERNANCE",
          label: "Governance review",
          status: "out-of-scope",
          blocking: true,
          evidenceRefs: ["test://gov"],
        }],
      },
    });

    expect(result.allowed).toBe(true);
  });
});
