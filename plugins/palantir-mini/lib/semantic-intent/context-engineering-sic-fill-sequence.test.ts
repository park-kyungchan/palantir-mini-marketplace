import { describe, expect, it } from "bun:test";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import {
  CONTEXT_ENGINEERING_TO_SIC_POLICY,
  CONTEXT_ENGINEERING_TO_SIC_SEQUENCE,
  advanceContextEngineeringToSicSequence,
  contextEngineeringSicReadinessIssues,
  isContextEngineeringToSicReady,
  type ContextEngineeringSicContract,
} from "./context-engineering-sic-fill-sequence";

function makeSemantic(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:test-context-engineering",
    status: "draft",
    rawIntent: "Complete Meta Ontology enforcement.",
    confirmedIntent: "Complete deterministic Context Engineering before SIC.",
    nonGoals: [],
    approvedNouns: [],
    approvedVerbs: [],
    affectedSurfaces: [],
    permissionsAndProposal: "",
    acceptedRisks: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    clarificationQuestions: [],
    ...overrides,
  };
}

function completeContextEngineeringSic(): ContextEngineeringSicContract {
  let contract = makeSemantic();
  contract = advanceContextEngineeringToSicSequence(
    contract,
    0,
    "Complete deterministic Context Engineering before SIC || Do not edit generated mirrors",
  );
  contract = advanceContextEngineeringToSicSequence(
    contract,
    1,
    "EvidenceSource:palantir-official, .claude/plugins/palantir-mini/lib/semantic-intent",
  );
  contract = advanceContextEngineeringToSicSequence(
    contract,
    2,
    "pm_semantic_intent_gate, pm_workflow_response_validate, release-gate-grader",
  );
  contract = advanceContextEngineeringToSicSequence(
    contract,
    3,
    "pm_semantic_intent_gate, pm_intent_router, pm_plugin_self_check | generated mirror direct edits",
  );
  contract = advanceContextEngineeringToSicSequence(
    contract,
    4,
    "permission:approved-boundary, provenance:events.jsonl, eval:release-self-check",
  );
  contract = advanceContextEngineeringToSicSequence(contract, 5, "ready-for-sic");
  return contract;
}

describe("context-engineering-to-sic fill sequence", () => {
  it("has the deterministic T0-T5 Context Engineering shape", () => {
    expect(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE.length).toBe(6);
    expect(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE.map((entry) => entry.turnIndex)).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
    ]);
    expect(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE[1]?.question).toContain("T1 DATA");
    expect(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE[2]?.question).toContain("T2 LOGIC");
    expect(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE[3]?.question).toContain("T3 ACTION");
    expect(CONTEXT_ENGINEERING_TO_SIC_SEQUENCE[4]?.question).toContain("SECURITY/GOVERNANCE");
  });

  it("advances all turns into a ready-for-SIC contract", () => {
    const contract = completeContextEngineeringSic();

    expect(contract.fillPolicy).toBe(CONTEXT_ENGINEERING_TO_SIC_POLICY);
    expect(contract.fillSequence?.length).toBe(6);
    expect(contract.verdict).toBe("filled");
    expect(contract.contextEngineeringReadiness?.dataEvidenceRefs.length).toBeGreaterThan(0);
    expect(contract.contextEngineeringReadiness?.logicRefs).toContain("pm_semantic_intent_gate");
    expect(contract.contextEngineeringReadiness?.actionRefs).toContain("pm_intent_router");
    expect(contract.contextEngineeringReadiness?.governanceRefs).toContain("eval:release-self-check");
    expect(contract.contextEngineeringReadiness?.readinessVerdict).toBe("ready-for-sic");
    expect(isContextEngineeringToSicReady(contract)).toBe(true);
    expect(contextEngineeringSicReadinessIssues(contract)).toEqual([]);
  });

  it("fails closed when approval is attempted before DATA/LOGIC/ACTION/GOVERNANCE readiness", () => {
    const contract = {
      ...makeSemantic({ status: "approved", approvalRef: "user:approved:test" }),
      fillPolicy: CONTEXT_ENGINEERING_TO_SIC_POLICY,
    } as unknown as SemanticIntentContract;

    const fields = contextEngineeringSicReadinessIssues(contract).map((issue) => issue.field);

    expect(fields).toContain("fillSequence");
    expect(fields).toContain("contextEngineeringReadiness.dataEvidenceRefs");
    expect(fields).toContain("contextEngineeringReadiness.logicRefs");
    expect(fields).toContain("contextEngineeringReadiness.actionRefs");
    expect(fields).toContain("contextEngineeringReadiness.governanceRefs");
    expect(fields).toContain("contextEngineeringReadiness.readinessVerdict");
  });

  it("throws RangeError for turns outside T0-T5", () => {
    const contract = makeSemantic();

    expect(() => advanceContextEngineeringToSicSequence(contract, -1)).toThrow(RangeError);
    expect(() => advanceContextEngineeringToSicSequence(contract, 6)).toThrow(RangeError);
  });
});
