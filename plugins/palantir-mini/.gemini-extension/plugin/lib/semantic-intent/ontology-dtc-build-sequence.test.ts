import { describe, expect, it } from "bun:test";
import type { DigitalTwinChangeContract } from "../lead-intent/contracts";
import {
  ONTOLOGY_DTC_BUILD_POLICY,
  ONTOLOGY_DTC_BUILD_SEQUENCE,
  advanceOntologyDTCBuildSequence,
  ontologyDtcBuildReadinessIssues,
  type OntologyDtcBuildContract,
} from "./ontology-dtc-build-sequence";

function makeDtc(overrides: Partial<DigitalTwinChangeContract> = {}): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:test-ontology-dtc-build",
    status: "draft",
    semanticIntentContractRef: "semantic-intent:test-context-engineering",
    affectedSurfaces: ["ontology/meta-ontology.ts"],
    changeBoundary: "Complete additive Meta Ontology surfaces only.",
    branchProposalPolicy: "Ship through a separate PR.",
    permissionBoundary: "No generated mirror direct edits.",
    replayMigrationPlan: "Replay fixtures remain additive.",
    observabilityPlan: "Record workflow lineage and release evidence.",
    toolSurfaceReadiness: "Codex discloses runtime gaps; plugin enforces contracts.",
    evaluationPlan: "Targeted tests, typecheck, self-check, replay evidence.",
    risks: [],
    ...overrides,
  };
}

function completeOntologyDtc(): OntologyDtcBuildContract {
  let contract = makeDtc();
  contract = advanceOntologyDTCBuildSequence(
    contract,
    0,
    "ObjectType:PluginCapability,ObjectType:WorkflowContract",
  ).dtcDraft;
  contract = advanceOntologyDTCBuildSequence(
    contract,
    1,
    "LinkType:contract-authorizes-route,LinkType:evidence-supports-authority",
  ).dtcDraft;
  contract = advanceOntologyDTCBuildSequence(
    contract,
    2,
    "ActionType:start-workflow,ActionType:approve-dtc",
  ).dtcDraft;
  contract = advanceOntologyDTCBuildSequence(
    contract,
    3,
    "Function:validate-release,Function:route-after-approval",
  ).dtcDraft;
  contract = advanceOntologyDTCBuildSequence(
    contract,
    4,
    "ApplicationState:workflow-review,ChatbotSurface:turn-card-rendering",
  ).dtcDraft;
  contract = advanceOntologyDTCBuildSequence(
    contract,
    5,
    "Replay additive fixtures | Observe workflow lineage | Eval release gate || ValidationPack:meta-ontology-completion",
  ).dtcDraft;
  contract = advanceOntologyDTCBuildSequence(contract, 6, "ready-for-dtc").dtcDraft;
  return contract;
}

describe("ontology-dtc-build fill sequence", () => {
  it("has the deterministic T0-T6 Ontology -> DTC shape", () => {
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE.length).toBe(7);
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE.map((entry) => entry.turnIndex)).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
    ]);
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE[0]?.question).toContain("ObjectType");
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE[1]?.question).toContain("LinkType");
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE[2]?.question).toContain("ActionType");
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE[3]?.question).toContain("Function");
    expect(ONTOLOGY_DTC_BUILD_SEQUENCE[4]?.question).toContain("Application State");
  });

  it("advances all turns into a ready-for-DTC contract", () => {
    const contract = completeOntologyDtc();

    expect(contract.fillPolicy).toBe(ONTOLOGY_DTC_BUILD_POLICY);
    expect(contract.ontologyDtcBuildSequence?.length).toBe(7);
    expect(contract.dtcFillSequence?.length).toBe(7);
    expect(contract.verdict).toBe("dtc-filled");
    expect(contract.ontologyDtcBuildReadiness?.objectTypeRefs).toContain("PluginCapability");
    expect(contract.ontologyDtcBuildReadiness?.linkTypeRefs).toContain("contract-authorizes-route");
    expect(contract.ontologyDtcBuildReadiness?.actionTypeRefs).toContain("start-workflow");
    expect(contract.ontologyDtcBuildReadiness?.functionRefs).toContain("validate-release");
    expect(contract.ontologyDtcBuildReadiness?.applicationStateRefs).toContain("ApplicationState:workflow-review");
    expect(contract.ontologyDtcBuildReadiness?.evaluationRefs).toContain("meta-ontology-completion");
    expect(contract.ontologyDtcBuildReadiness?.readinessVerdict).toBe("ready-for-dtc");
    expect(ontologyDtcBuildReadinessIssues(contract)).toEqual([]);
  });

  it("fails closed when approval is attempted before ontology readiness", () => {
    const contract = {
      ...makeDtc({ status: "approved", approvalRef: "user:approved:test" }),
      fillPolicy: ONTOLOGY_DTC_BUILD_POLICY,
    } as unknown as DigitalTwinChangeContract;

    const fields = ontologyDtcBuildReadinessIssues(contract).map((issue) => issue.field);

    expect(fields).toContain("ontologyDtcBuildSequence");
    expect(fields).toContain("ontologyDtcBuildReadiness.objectTypeRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.linkTypeRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.actionTypeRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.functionRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.applicationStateRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.evaluationRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.readinessVerdict");
  });

  it("throws RangeError for turns outside T0-T6", () => {
    const contract = makeDtc();

    expect(() => advanceOntologyDTCBuildSequence(contract, -1)).toThrow(RangeError);
    expect(() => advanceOntologyDTCBuildSequence(contract, 7)).toThrow(RangeError);
  });
});
