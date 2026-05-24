import { describe, expect, test } from "bun:test";
import {
  HANDLER_MODULES,
  TOOLS,
} from "../../../bridge/mcp-server";
import handler, {
  pmSemanticWorkbenchState,
} from "../../../bridge/handlers/pm-semantic-workbench-state";
import type { SemanticConversationState } from "../../../lib/chatbot-studio/semantic-conversation-state";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

function conversation(): SemanticConversationState {
  return {
    stateId: "semantic-conversation:workbench-handler",
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: {
      runtime: "codex",
    },
    userFacing: {
      preferredLanguage: "ko",
      userExpertise: "non_programmer",
      plainRequestSummary: "Confirm meaning before DTC authoring.",
      confirmedGoal: "Confirm semantic intent before implementation.",
      confirmedNonGoals: ["Do not mutate project files before DTC approval."],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: ["SemanticIntentContract"],
      activatedActionRefs: ["review"],
      activatedSurfaceRefs: ["lib/chatbot-studio/workbench-state.ts"],
      activatedLaneRefs: ["aip-3-context-engineering"],
      forbiddenSurfaceRefs: ["public MCP registration"],
    },
    skillFacing: {
      candidateSkillRefs: [
        {
          skillId: "pm-semantic-intent-gate",
          displayName: "semantic intent gate",
          confidence: "exact",
        },
      ],
      selectedSkillRefs: [],
      skillRoutingReason: "Workbench preview must not widen the DTC boundary.",
    },
    contractFacing: {
      semanticIntentContractRef: "semantic:workbench",
      dtcReady: false,
    },
    projectFacing: {
      projectRoot: "/home/palantirkc/.claude/plugins/palantir-mini",
      projectScopeLaneIds: ["aip-3-context-engineering"],
      requiredValidationPacks: ["semantic-workbench-state"],
    },
    lifecycle: "semantic-approved",
  };
}

function fdeSession(): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-session:workbench",
    projectRoot: "/home/palantirkc/.claude/plugins/palantir-mini",
    universalOntologyEntryRef: "universal-ontology-entry://workbench",
    phase: "mission-decision",
    turnCount: 1,
    userFacingSummary: "Review a lead ontology turn.",
    confirmedNonGoals: ["No mutation from cards."],
    latentHypotheses: [
      {
        hypothesisId: "latent:workbench-choice",
        ruleId: "generic.prompt-mission-decision",
        status: "inferred",
        family: "mission-decision",
        readinessRequirementIds: ["latent-intent-decision"],
        plainLanguage: "Confirm workbench mission.",
        whyLeadInferredThis: "Workbench test.",
        whatUserMayNotHaveNoticed: "Card choices map to internal actions.",
        recommendedDefault: "Accept.",
        riskIfWrong: "Wrong mission.",
        whatWillNotHappenIfAccepted: ["No mutation authority."],
        ontologyImplication: {
          possibleObjects: ["MissionDecision"],
          possibleLinks: [],
          possibleActions: [],
          possibleFunctions: [],
        },
        evidenceNeeded: [],
        sourceRefs: [],
      },
    ],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    objectCandidates: [],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    sourceRefs: ["universal-ontology-entry://workbench"],
    recentTurnSummaries: [],
    turnRecordIds: ["turn-1"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

describe("pm-semantic-workbench-state internal handler", () => {
  test("exports SemanticWorkbenchState without requiring public MCP registration", () => {
    const state = pmSemanticWorkbenchState({
      conversation: conversation(),
      nextAllowedActions: ["draft-dtc"],
    });

    expect(state.schemaVersion).toBe("palantir-mini/semantic-workbench-state/v1");
    expect(state.nextAllowedActions).toEqual(["draft-dtc"]);
    expect(state.candidateSkills[0]?.skillId).toBe("pm-semantic-intent-gate");
    expect(state.ontologyPreview.forbidden).toEqual(["public MCP registration"]);
  });

  test("default handler validates raw input before building state", async () => {
    const state = await handler({
      conversation: conversation(),
      reviewTitle: "Semantic review",
    });

    expect(state.reviewCards[0]?.title).toBe("Semantic review");
    await expect(handler({ conversation: {} })).rejects.toThrow("conversation.stateId");
  });

  test("projects Lead ontology turn cards only when FDE engineering session is supplied", () => {
    const withoutFde = pmSemanticWorkbenchState({ conversation: conversation() });
    const withFde = pmSemanticWorkbenchState({
      conversation: conversation(),
      fdeEngineeringSession: fdeSession(),
    });

    expect("leadOntologyTurnCardV2" in withoutFde).toBe(false);
    expect("leadOntologyTurnCardV3" in withoutFde).toBe(false);
    expect(withFde.leadOntologyTurnCardV2?.schemaVersion).toBe(
      "palantir-mini/lead-ontology-turn-card/v2",
    );
    expect(withFde.leadOntologyTurnCardV3?.schemaVersion).toBe(
      "palantir-mini/lead-ontology-turn-card/v3",
    );
    expect(withFde.reviewCards[0]?.choices[0]?.choiceId).toContain("lead-card-choice");
    expect(withFde.reviewCards[0]?.choices[0]?.internalAction).toBeDefined();
    expect(withFde.leadOntologyTurnCardV2?.mutationAuthorizedFromCard).toBe(false);
    expect(withFde.leadOntologyTurnCardV3?.mutationAuthorizedFromCard).toBe(false);
    expect(withFde.leadOntologyTurnCardV3?.choices[0]?.effect.contextEngineeringDomains).toEqual([
      "DATA",
    ]);
  });

  test("is not exposed as a public MCP tool in Phase F", () => {
    expect(TOOLS.some((tool) => tool.name === "pm_semantic_workbench_state")).toBe(false);
    expect(Object.hasOwn(HANDLER_MODULES, "pm_semantic_workbench_state")).toBe(false);
  });
});
