import { describe, expect, test } from "bun:test";
import {
  buildContextEngineeringPlan,
  buildContextEngineeringPlanV2,
  buildContextEngineeringPlanV3,
} from "../../../lib/context-engineering/context-plan-builder";
import {
  draftDtcFromContextPlan,
  draftDtcFromContextPlanV2,
  draftDtcFromContextPlanV3,
} from "../../../lib/context-engineering/dtc-from-context-plan";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

const semantic: SemanticIntentContract = {
  contractId: "semantic-intent:dtc-from-context-plan",
  status: "approved",
  rawIntent: "Draft DTC",
  confirmedIntent: "Draft a DTC from approved context plan.",
  nonGoals: ["Do not approve mutation."],
  approvedNouns: ["DigitalTwinChangeContract"],
  approvedVerbs: ["draft"],
  affectedSurfaces: ["lib/context-engineering/dtc-from-context-plan.ts"],
  permissionsAndProposal: "plugin-local",
  acceptedRisks: [],
  downstreamAllowed: ["DTC draft"],
  downstreamForbidden: ["mutation approval"],
  clarificationQuestions: [],
  approvalRef: "user:approved:dtc-plan",
};

const fdeSession = {
  sessionId: "fde-session-dtc",
  projectRoot: "/repo",
  sourceRefs: ["research:aip"],
  confirmedUserGoal: "Draft reviewable DTC",
  objectCandidates: [],
  linkCandidates: [],
  actionCandidates: [{ candidateId: "action-1", plainName: "ApproveMutation", operationalIntent: "", writebackRisk: "medium", evidenceRefs: [] }],
  functionCandidates: [],
  chatbotContextCandidates: [],
} satisfies Pick<
  FDEOntologyEngineeringSession,
  | "sessionId"
  | "projectRoot"
  | "sourceRefs"
  | "confirmedUserGoal"
  | "objectCandidates"
  | "linkCandidates"
  | "actionCandidates"
  | "functionCandidates"
  | "chatbotContextCandidates"
>;

describe("draftDtcFromContextPlan", () => {
  test("drafts DTC from approved SIC and exposes DATA/LOGIC/ACTION review", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const contextEngineeringPlan = buildContextEngineeringPlan({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex,
    });

    const result = draftDtcFromContextPlan({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(result.digitalTwinChangeContract.status).toBe("draft");
    expect(result.digitalTwinChangeContract.semanticIntentContractRef).toBe(semantic.contractId);
    expect(result.reviewBeforeMutationApproval.data).toContain("DATA:");
    expect(result.reviewBeforeMutationApproval.logic).toContain("LOGIC:");
    expect(result.reviewBeforeMutationApproval.action).toContain("ACTION:");
    expect(result.reviewBeforeMutationApproval.approvalInstruction).toContain(
      "not approval for ontology/schema/reference-pack writeback",
    );
    expect(result.digitalTwinChangeContract.toolSurfaceReadiness).toContain(
      "DATA, LOGIC, and ACTION",
    );
  });

  test("drafts V2 DTC with structured boundary, runtime recommendations, validation, and decisions", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const contextEngineeringPlan = buildContextEngineeringPlanV2({
      semanticIntentContract: semantic,
      fdeSession: {
        ...fdeSession,
        objectCandidates: [
          { candidateId: "object-1", plainName: "Decision", whyItMayMatter: "", evidenceRefs: [] },
        ],
        functionCandidates: [
          { candidateId: "fn-1", plainName: "ComputeDecision", logicIntent: "", evidenceRefs: [] },
        ],
      },
      projectIndex,
    });

    const result = draftDtcFromContextPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(result.digitalTwinChangeContract.status).toBe("draft");
    expect(result.digitalTwinChangeContract.changeBoundary).toContain("Decision");
    expect(result.digitalTwinChangeContract.changeBoundary).toContain("ComputeDecision");
    expect(result.digitalTwinChangeContract.toolSurfaceReadiness).toContain("convex-only-backend");
    expect(result.digitalTwinChangeContract.toolSurfaceReadiness).toContain("chatbot-studio-workbench");
    expect(result.digitalTwinChangeContract.evaluationPlan).toContain("context-plan-v2");
    expect(result.digitalTwinChangeContract.structuredBoundary).toBeDefined();
    expect(Object.keys(result.digitalTwinChangeContract.structuredBoundary ?? {})).toEqual([
      "changeBoundary",
      "branchProposalPolicy",
      "permissionBoundary",
      "replayMigrationPlan",
      "observabilityPlan",
      "toolSurfaceReadiness",
      "evaluationPlan",
    ]);
    expect(result.digitalTwinChangeContract.risks.map((risk) => risk.riskId)).toContain(
      "context-plan-v2.required-user-decisions",
    );
    expect(result.digitalTwinChangeContract.requiredUserDecisions?.map((decision) => decision.domain)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(result.digitalTwinChangeContract.requiredUserDecisions?.every((decision) => decision.status === "open")).toBe(true);
    expect(result.reviewBeforeMutationApproval.requiredUserDecisions.map((decision) => decision.label)).toContain(
      "Approve GOVERNANCE and validation boundary",
    );
    expect(result.reviewBeforeMutationApproval.approvalInstruction).toContain(
      "not approval for ontology/schema/reference-pack writeback",
    );
  });

  test("drafts V3 DTC with SECURITY lane evidence while staying advisory-only", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const contextEngineeringPlan = buildContextEngineeringPlanV3({
      semanticIntentContract: semantic,
      fdeSession: {
        ...fdeSession,
        objectCandidates: [
          { candidateId: "object-1", plainName: "Decision", whyItMayMatter: "", evidenceRefs: [] },
        ],
        functionCandidates: [
          { candidateId: "fn-1", plainName: "ComputeDecision", logicIntent: "", evidenceRefs: [] },
        ],
      },
      projectIndex,
    });

    const result = draftDtcFromContextPlanV3({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(result.digitalTwinChangeContract.status).toBe("draft");
    expect(result.digitalTwinChangeContract.changeBoundary).toContain("SECURITY");
    expect(result.digitalTwinChangeContract.permissionBoundary).toContain(
      "No review card, lane, mirror, or DTC draft grants mutation authority",
    );
    expect(result.digitalTwinChangeContract.structuredBoundary?.changeBoundary.evidenceRefs).toContain(
      "INDEX.md",
    );
    expect(result.digitalTwinChangeContract.requiredUserDecisions?.map((decision) => String(decision.domain))).toContain(
      "SECURITY",
    );
    expect(result.digitalTwinChangeContract.risks.map((risk) => risk.riskId)).toContain(
      "context-plan-v3.security-lane-advisory-only",
    );
    expect(result.reviewBeforeMutationApproval.laneBoundaries.map((lane) => lane.lane)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "SECURITY",
    ]);
    expect(result.reviewBeforeMutationApproval.laneBoundaries.every((lane) => lane.advisoryOnly)).toBe(true);
    expect(
      result.reviewBeforeMutationApproval.laneBoundaries.every(
        (lane) => lane.mutationAuthorizedFromCard === false,
      ),
    ).toBe(true);
    expect(result.reviewBeforeMutationApproval.approvalInstruction).toContain(
      "not approval for ontology/schema/reference-pack writeback",
    );
  });
});
