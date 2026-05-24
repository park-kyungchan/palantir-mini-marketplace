import { describe, expect, test } from "bun:test";
import {
  buildSemanticWorkbenchState,
} from "../../../lib/chatbot-studio/workbench-state";
import type { SemanticConversationState } from "../../../lib/chatbot-studio/semantic-conversation-state";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

function conversation(): SemanticConversationState {
  return {
    stateId: "semantic-conversation:fde-engineering-panel",
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: { promptId: "prompt-1", sessionId: "session-1", runtime: "codex" },
    userFacing: {
      preferredLanguage: "en",
      userExpertise: "developer",
      plainRequestSummary: "Engineer an FDE ontology session.",
      confirmedNonGoals: [],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: [],
      activatedActionRefs: [],
      activatedSurfaceRefs: [],
      activatedLaneRefs: [],
      forbiddenSurfaceRefs: [],
    },
    skillFacing: {
      candidateSkillRefs: [],
      selectedSkillRefs: [],
      rejectedSkillRefs: [],
      skillRoutingReason: "test fixture",
    },
    contractFacing: { dtcReady: false },
    projectFacing: {
      projectRoot: "/tmp/fde-engineering-panel",
      projectScopeLaneIds: [],
      requiredValidationPacks: [],
    },
    lifecycle: "clarifying",
  };
}

function fdeEngineeringSession(
  overrides: Partial<FDEOntologyEngineeringSession> = {},
): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-ontology-engineering:test",
    projectRoot: "/tmp/fde-engineering-panel",
    universalOntologyEntryRef: "universal-ontology-entry://test",
    phase: "object-type-discovery",
    turnCount: 2,
    userFacingSummary: "Understand student misconception intervention decisions.",
    confirmedNonGoals: ["Do not authorize mutation from the panel."],
    latentHypotheses: [
      {
        hypothesisId: "hypothesis:student-work",
        status: "accepted",
        plainLanguage: "Student work is the primary evidence object.",
        whyLeadInferredThis: "The prompt asks where learners get stuck.",
        whatUserMayNotHaveNoticed: "This implies evidence capture, not just summary text.",
        recommendedDefault: "Model StudentWork as an object candidate.",
        riskIfWrong: "The ontology may miss the evidence-bearing object.",
        whatWillNotHappenIfAccepted: ["No writeback action is implied."],
        ontologyImplication: {
          possibleObjects: ["StudentWork"],
          possibleLinks: ["Student has Work"],
          possibleActions: [],
          possibleFunctions: ["MisconceptionDetector"],
        },
        evidenceNeeded: ["sample-work-ref"],
        sourceRefs: ["universal-ontology-entry://test"],
      },
      {
        hypothesisId: "hypothesis:teacher-action",
        status: "deferred",
        plainLanguage: "Teacher follow-up may become an action.",
        whyLeadInferredThis: "The workflow mentions intervention.",
        whatUserMayNotHaveNoticed: "Action writeback needs DTC approval.",
        recommendedDefault: "Keep as deferred until writeback is explicit.",
        riskIfWrong: "The system may invent an action boundary.",
        whatWillNotHappenIfAccepted: ["No mutation will be authorized."],
        ontologyImplication: {
          possibleObjects: [],
          possibleLinks: [],
          possibleActions: ["ScheduleFollowUp"],
          possibleFunctions: [],
        },
        evidenceNeeded: ["teacher-policy-ref"],
        sourceRefs: ["policy://teacher-action"],
      },
    ],
    acceptedHypothesisIds: ["hypothesis:student-work"],
    rejectedHypothesisIds: [],
    objectCandidates: [
      {
        candidateId: "object:student-work",
        plainName: "StudentWork",
        whyItMayMatter: "It carries observable evidence.",
        evidenceRefs: ["sample-work-ref"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "link:student-work",
        plainName: "Student has Work",
        sourceObject: "Student",
        targetObject: "StudentWork",
        businessMeaning: "Student work belongs to a learner.",
        evidenceRefs: ["sample-work-ref"],
      },
    ],
    actionCandidates: [],
    functionCandidates: [
      {
        candidateId: "function:misconception-detector",
        plainName: "MisconceptionDetector",
        logicIntent: "Classify likely misconception from work evidence.",
        deterministic: false,
        evidenceRefs: ["sample-work-ref"],
      },
    ],
    chatbotContextCandidates: [
      {
        candidateId: "chatbot:teacher-context",
        plainName: "TeacherContext",
        applicationStateNeed: "Current class and assignment context.",
        retrievalContextNeed: "Recent work samples.",
        evidenceRefs: ["teacher-context-ref"],
      },
    ],
    unresolvedQuestions: [
      {
        questionId: "q:writeback",
        phase: "action-writeback-discovery",
        plainQuestion: "Should the teacher follow-up be an action?",
        whyItMatters: "Action writeback changes the mutation boundary.",
        recommendedDefault: "Keep read-only for now.",
        blocking: true,
      },
    ],
    sourceRefs: ["universal-ontology-entry://test"],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:10:00.000Z",
    ...overrides,
  };
}

describe("workbench-state FDE ontology-engineering panel", () => {
  test("omits fdeEngineeringPanel unless an FDE engineering session is supplied", () => {
    const state = buildSemanticWorkbenchState({ conversation: conversation() });

    expect(Object.keys(state)).not.toContain("fdeEngineeringPanel");
    expect(state.fdeEngineeringPanel).toBeUndefined();
  });

  test("projects phase, hypotheses, decisions, ontology shape, questions, and SIC/DTC readiness", () => {
    const state = buildSemanticWorkbenchState({
      conversation: conversation(),
      fdeEngineeringSession: fdeEngineeringSession({
        semanticIntentContractRef: "semantic-intent:approved:fde",
      }),
    });

    const panel = state.fdeEngineeringPanel;
    expect(panel).toBeDefined();
    expect(panel?.phase).toBe("object-type-discovery");
    expect(panel?.latentHypotheses).toHaveLength(2);
    expect(panel?.decisions.accepted[0]?.hypothesisId).toBe("hypothesis:student-work");
    expect(panel?.decisions.deferred[0]?.hypothesisId).toBe("hypothesis:teacher-action");
    expect(panel?.currentOntologyShape.objects).toEqual(["StudentWork"]);
    expect(panel?.currentOntologyShape.links).toEqual(["Student has Work"]);
    expect(panel?.currentOntologyShape.functions).toEqual(["MisconceptionDetector"]);
    expect(panel?.currentOntologyShape.chatbotContexts).toEqual(["TeacherContext"]);
    expect(panel?.nextQuestions[0]?.blocking).toBe(true);
    expect(panel?.readiness.semanticIntentReady).toBe(true);
    expect(panel?.readiness.digitalTwinReady).toBe(false);
    expect(panel?.readiness.sicDtcReady).toBe(false);
    expect(panel?.mutationAuthorizedFromPanel).toBe(false);
  });

  test("marks SIC/DTC ready only when both contract refs or terminal phase are present", () => {
    const state = buildSemanticWorkbenchState({
      conversation: conversation(),
      fdeEngineeringSession: fdeEngineeringSession({
        phase: "dtc-ready",
      }),
    });

    expect(state.fdeEngineeringPanel?.readiness).toMatchObject({
      semanticIntentReady: true,
      digitalTwinReady: true,
      sicDtcReady: true,
    });
    expect(state.fdeEngineeringPanel?.mutationAuthorizedFromPanel).toBe(false);
  });
});
