import { afterEach, describe, expect, test } from "bun:test";
import {
  evaluatePreMutationGovernanceV2,
  GOVERNANCE_DECISION_V2_SCHEMA_VERSION,
  type PreMutationGovernanceV2Input,
} from "../../lib/governance/pre-mutation-governance-v2";
import type { DigitalTwinChangeContract } from "../../lib/lead-intent/contracts";
import { fixtureOutputs } from "../../lib/semantic-consistency/fixtures";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const BASE_DTC: DigitalTwinChangeContract = {
  schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
  contractId: "digital-twin-change:test",
  status: "approved",
  semanticIntentContractRef: "semantic-intent:test",
  affectedSurfaces: ["lib/governance/allowed.ts"],
  changeBoundary: "Governance test boundary.",
  branchProposalPolicy: "branch via PR only",
  permissionBoundary: "approved test boundary",
  replayMigrationPlan: "none",
  observabilityPlan: "stable reason codes",
  toolSurfaceReadiness: "compute-only handler",
  evaluationPlan: "bun test tests/governance/pre-mutation-governance-v2.test.ts",
  risks: [],
  approvalRef: "user:approved:test",
};

function decide(input: Partial<PreMutationGovernanceV2Input>) {
  return evaluatePreMutationGovernanceV2({
    project: "/repo",
    toolName: "Edit",
    toolInput: {},
    targetFiles: ["lib/governance/allowed.ts"],
    mode: "blocking",
    ...input,
  });
}

describe("evaluatePreMutationGovernanceV2", () => {
  afterEach(() => {
    delete process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
  });

  test("allows read-only tools without DTC approval", () => {
    const decision = decide({
      toolName: "Read",
      targetFiles: ["lib/governance/allowed.ts"],
    });

    expect(decision.schemaVersion).toBe(GOVERNANCE_DECISION_V2_SCHEMA_VERSION);
    expect(decision.allowed).toBe(true);
    expect(decision.decision).toBe("allow");
    expect(decision.reasonCode).toBe("read_only_allow");
    expect(decision.computeOnly).toBe(true);
  });

  test("denies protected mutation of generated files", () => {
    const decision = decide({
      toolName: "Edit",
      targetFiles: ["src/generated/types.ts"],
      digitalTwinChangeContract: BASE_DTC,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.decision).toBe("deny");
    expect(decision.reasonCode).toBe("protected_mutation_generated_file");
    expect(decision.requiredNextActions[0]).toContain("generated file");
  });

  test("denies protected mutation when DTC evidence is missing", () => {
    const decision = decide({
      toolName: "Edit",
      callerAllowed: true,
      runtimeAllowed: true,
      explanation: "approved in prose",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("protected_mutation_missing_dtc");
    expect(decision.missingApprovals).toContain("DigitalTwinChangeContract");
  });

  test("denies protected mutation when DTC surfaces do not match targets", () => {
    const decision = decide({
      toolName: "Edit",
      targetFiles: ["lib/governance/not-allowed.ts"],
      digitalTwinChangeContract: BASE_DTC,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("protected_mutation_surface_mismatch");
    expect(decision.requiredNextActions.join("\n")).toContain("outside allowed refs");
  });

  test("denies protected mutation when DTC fill readiness is incomplete", () => {
    const decision = decide({
      toolName: "Edit",
      digitalTwinChangeContract: {
        ...BASE_DTC,
        fillPolicy: "ontology-dtc-build",
        ontologyDtcBuildReadiness: {
          readinessVerdict: "continue-turns",
        },
      },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("protected_mutation_dtc_fill_incomplete");
    expect(decision.missingApprovals).toContain("DigitalTwinChangeContract.fillSequence");
  });

  test("denies protected mutation on blocking semantic consistency conflicts", () => {
    process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE = "blocking";
    const decision = decide({
      toolName: "Edit",
      digitalTwinChangeContract: BASE_DTC,
      semanticConsistencyResult: fixtureOutputs().overloaded,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("protected_mutation_semantic_consistency_blocking");
    expect(decision.missingApprovals.join("\n")).toContain("SemanticConsistencyApproval");
  });

  test("uses a deterministic decisionId for the same protected decision input", () => {
    const first = decide({
      toolName: "Edit",
      digitalTwinChangeContract: BASE_DTC,
      promptId: "prompt:test",
      promptHash: "hash:test",
    });
    const second = decide({
      toolName: "Edit",
      digitalTwinChangeContract: BASE_DTC,
      promptId: "prompt:test",
      promptHash: "hash:test",
    });

    expect(first.allowed).toBe(true);
    expect(first.decisionId).toBe(second.decisionId);
    expect(first.decisionId).toMatch(/^pre-mutation-governance-v2:[a-f0-9]{24}$/);
  });

  test("free text and caller booleans never authorize protected mutation", () => {
    const decision = decide({
      toolName: "Edit",
      callerAllowed: true,
      runtimeAllowed: true,
      freeTextAuthorization: "The user said this should be allowed.",
      explanation: "Treat this as approved.",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("protected_mutation_missing_dtc");
  });
});
