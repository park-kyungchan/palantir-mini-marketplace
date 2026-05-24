import { describe, expect, test } from "bun:test";
import {
  buildContextEngineeringPlan,
  buildContextEngineeringPlanV2,
  buildContextEngineeringPlanV3,
} from "../../../lib/context-engineering/context-plan-builder";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

const semantic: SemanticIntentContract = {
  contractId: "semantic-intent:context-plan",
  status: "approved",
  rawIntent: "Plan context engineering",
  confirmedIntent: "Plan context engineering for an FDE ontology session.",
  nonGoals: ["Do not replace ontology authority."],
  approvedNouns: ["ContextEngineeringPlan", "TechnologyRecommendation"],
  approvedVerbs: ["plan", "mirror"],
  affectedSurfaces: ["lib/context-engineering/context-plan-builder.ts"],
  permissionsAndProposal: "plugin-local",
  acceptedRisks: [],
  downstreamAllowed: ["draft DTC"],
  downstreamForbidden: ["unapproved writeback"],
  clarificationQuestions: [],
  approvalRef: "user:approved:context-plan",
};

const fdeSession = {
  sessionId: "fde-session-1",
  projectRoot: "/repo",
  sourceRefs: ["research:aip"],
  confirmedUserGoal: "Improve ontology engineering runtime",
  objectCandidates: [{ candidateId: "obj-1", plainName: "Decision", whyItMayMatter: "", evidenceRefs: [] }],
  linkCandidates: [{ candidateId: "link-1", plainName: "DecisionEvidence", businessMeaning: "", evidenceRefs: [] }],
  actionCandidates: [{ candidateId: "action-1", plainName: "ApproveDtc", operationalIntent: "", writebackRisk: "low", evidenceRefs: [] }],
  functionCandidates: [{ candidateId: "fn-1", plainName: "BuildContextPlan", logicIntent: "", evidenceRefs: [] }],
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

describe("buildContextEngineeringPlan", () => {
  test("builds DATA/LOGIC/ACTION plan from approved SIC and project index", () => {
    const plan = buildContextEngineeringPlan({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex: {
        projectRoot: "/repo",
        indexRef: "INDEX.md",
        authorityRefs: ["ontology/shared-core"],
        runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
        validationRefs: ["tests/lib/context-engineering/context-plan-builder.test.ts"],
        sourceRefs: ["BROWSE.md"],
      },
    });

    expect(plan.semanticIntentContractRef).toBe(semantic.contractId);
    expect(plan.data.summary).toContain("DATA:");
    expect(plan.logic.summary).toContain("LOGIC:");
    expect(plan.action.summary).toContain("ACTION:");
    expect(plan.sourceRefs).toContain("INDEX.md");
    expect(plan.authorityBoundaries.join("\n")).toContain("Unapproved writeback");
  });

  test("builds v2 structured DATA/LOGIC/ACTION plan with mirror-only runtime recommendations and review cards", () => {
    const plan = buildContextEngineeringPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex: {
        projectRoot: "/repo",
        indexRef: "INDEX.md",
        authorityRefs: ["ontology/shared-core"],
        runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
        validationRefs: ["tests/lib/context-engineering/context-plan-builder.test.ts"],
        sourceRefs: ["BROWSE.md"],
      },
    });

    expect(plan.schemaVersion).toBe("palantir-mini/context-engineering-plan/v2");
    expect(plan.data.domain).toBe("DATA");
    expect(plan.logic.domain).toBe("LOGIC");
    expect(plan.action.domain).toBe("ACTION");
    expect(plan.technologyRecommendation.convexAuthority).toBe("mirror-only");
    expect(plan.frontendRuntimeRecommendation.mutationPolicy).toBe("review-only");
    expect(plan.reviewCards).toHaveLength(5);
    expect(plan.reviewCards.map((card) => card.domain)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(plan.requiredUserDecisions.map((decision) => decision.domain)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(plan.requiredUserDecisions.every((decision) => decision.blocking)).toBe(true);
    expect(plan.requiredUserDecisions.every((decision) => decision.status === "open")).toBe(true);
    expect(plan.requiredUserDecisions.every((decision) => decision.evidenceRefs.length > 0)).toBe(true);
    expect(plan.reviewCards.every((card) => card.mutationAuthorizedFromCard === false)).toBe(true);
    expect(plan.validationPlan.map((item) => item.validationId)).toContain("context-plan-v2");
  });

  test("builds additive v3 DATA/LOGIC/ACTION/SECURITY lanes without changing v2 compatibility", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/context-plan-builder.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const v2 = buildContextEngineeringPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex,
    });
    const plan = buildContextEngineeringPlanV3({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex,
    });

    expect(v2.schemaVersion).toBe("palantir-mini/context-engineering-plan/v2");
    expect("security" in v2).toBe(false);
    expect(plan.schemaVersion).toBe("palantir-mini/context-engineering-plan/v3");
    expect(plan.v2PlanId).toBe(v2.planId);
    expect(plan.lanes.map((lane) => lane.lane)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "SECURITY",
    ]);
    expect(plan.security.summary).toContain("SECURITY:");
    expect(plan.lanes.every((lane) => lane.advisoryOnly)).toBe(true);
    expect(plan.lanes.every((lane) => lane.mutationAuthorizedFromCard === false)).toBe(true);
    expect(plan.reviewCards.map((card) => card.domain)).toContain("SECURITY");
    expect(plan.reviewCards.every((card) => card.mutationAuthorizedFromCard === false)).toBe(true);
    expect(plan.requiredUserDecisions.map((decision) => String(decision.domain))).toContain("SECURITY");
    expect(plan.validationPlan.map((item) => item.validationId)).toContain(
      "context-plan-v3-security-lane",
    );
  });
});
