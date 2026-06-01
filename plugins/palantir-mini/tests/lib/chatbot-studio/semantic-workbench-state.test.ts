import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION,
  buildSemanticWorkbenchState,
} from "../../../lib/chatbot-studio/workbench-state";
import {
  buildLLMControlFacingState,
  type SemanticConversationState,
} from "../../../lib/chatbot-studio/semantic-conversation-state";

function conversation(overrides: Partial<SemanticConversationState> = {}): SemanticConversationState {
  const stateId = overrides.stateId ?? "semantic-conversation:problem-15";
  return {
    stateId,
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: {
      promptId: "prompt-1",
      promptHash: "hash-1",
      sessionId: "session-1",
      runtime: "codex",
    },
    userFacing: {
      preferredLanguage: "ko",
      userExpertise: "non_programmer",
      plainRequestSummary:
        "Problem 15 lecture trace should be checked before review-video handoff.",
      confirmedGoal: "Create read-only evidence for problem 15 lecture trace handoff.",
      confirmedNonGoals: [
        "Do not rewrite Sequencer runtime.",
        "Do not rewrite Presenter runtime.",
      ],
      unresolvedQuestions: [],
    },
    ontologyFacing: {
      activatedObjectRefs: ["Problem15", "LectureTrace", "ReviewVideoHandoff"],
      activatedActionRefs: ["inspect", "derive", "validate"],
      activatedSurfaceRefs: ["src/lib/learningTrace/*"],
      activatedLaneRefs: ["aip-3-context-engineering", "aip-4-ontology-system"],
      forbiddenSurfaceRefs: ["src/components/sequencer/*", "src/components/presenter/*"],
    },
    skillFacing: {
      candidateSkillRefs: [
        {
          skillId: "palantir-math-expert",
          skillPath: ".claude/skills/palantir-math-expert/SKILL.md",
          displayName: "palantir-math expert",
          confidence: "exact",
        },
      ],
      selectedSkillRefs: [],
      rejectedSkillRefs: [
        {
          skillId: "sequencer-math",
          reason: "Needs approved solution.md before compiling seq-data.json.",
        },
      ],
      skillRoutingReason: "Use the lecture evidence path before runtime mutation.",
    },
    contractFacing: {
      semanticIntentContractRef: "semantic:problem15",
      dtcReady: false,
    },
    projectFacing: {
      projectRoot: "/home/palantirkc/projects/palantir-math",
      projectScopeLaneIds: ["aip-3-context-engineering", "aip-4-ontology-system"],
      requiredValidationPacks: ["learningTraceProblem15"],
    },
    impactFacing: {
      directSurfaceRefs: ["src/lib/learningTrace/*"],
      downstreamSurfaceRefs: ["tests/learningTraceProblem15.test.ts"],
      confidence: "high",
    },
    issueFacing: {
      knownIssueIds: ["problem15-lecture-trace-pilot"],
      warnings: [
        "medium: Problem 15 lecture trace remains pilot-scoped - Keep problem 15 as pilot evidence.",
      ],
    },
    validationFacing: {
      requiredValidationPacks: ["learningTraceProblem15"],
      suggestedCommands: ["bun test tests/learningTraceProblem15.test.ts"],
    },
    lifecycle: "semantic-approved",
    ...overrides,
    llmControlFacing: overrides.llmControlFacing ?? buildLLMControlFacingState(stateId),
  };
}

describe("SemanticWorkbenchState", () => {
  test("projects conversation state into a user-reviewable workbench shape", () => {
    const state = buildSemanticWorkbenchState({
      conversation: conversation(),
    });

    expect(state.schemaVersion).toBe(SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION);
    expect(state.ontologyPreview.objects).toEqual([
      "Problem15",
      "LectureTrace",
      "ReviewVideoHandoff",
    ]);
    expect(state.ontologyPreview.forbidden).toContain("src/components/sequencer/*");
    expect(state.candidateSkills.map((skill) => skill.skillId)).toEqual([
      "palantir-math-expert",
    ]);
    expect(state.impactPreview.confidence).toBe("high");
    expect(state.issuePreview[0]?.issueId).toBe("problem15-lecture-trace-pilot");
    expect(state.validationPreview[0]?.command).toBe("bun test tests/learningTraceProblem15.test.ts");
    expect(state.rejectedSkills[0]?.skillId).toBe("sequencer-math");
    expect(state.nextAllowedActions).toEqual([
      "draft-dtc",
      "request-dtc-approval",
      "hold-before-mutation",
    ]);
    expect(state.reviewCards[0]?.plainSummary).toContain("problem 15 lecture trace");
  });

  test("turns unresolved semantic questions into bounded review choices", () => {
    const state = buildSemanticWorkbenchState({
      conversation: conversation({
        contractFacing: {
          dtcReady: false,
        },
        lifecycle: "clarifying",
        userFacing: {
          preferredLanguage: "ko",
          userExpertise: "non_programmer",
          plainRequestSummary: "Connect problem 15 to review video handoff.",
          confirmedNonGoals: [],
          unresolvedQuestions: [
            {
              questionId: "problem15-first-target",
              plainQuestion:
                "Should this first PR stop at lecture trace, or include a hyperframes handoff draft?",
              whyItMatters:
                "The answer changes the DTC boundary before any mutation can begin.",
              recommendedAnswer: "Stop at read-only lecture trace evidence in this slice.",
              whatWillNotHappen: ["No hyperframes HTML is generated in this slice."],
              materiality: "blocking",
            },
          ],
        },
      }),
    });

    expect(state.reviewCards).toHaveLength(1);
    expect(state.reviewCards[0]?.title).toBe("Blocking clarification");
    expect(state.reviewCards[0]?.choices.map((choice) => choice.label)).toEqual([
      "Accept recommendation",
      "Revise meaning",
      "Hold",
    ]);
    expect(state.nextAllowedActions).toEqual([
      "answer-clarification",
      "revise-semantic-meaning",
      "hold-before-dtc",
    ]);
  });

  test("plugin workbench HTML consumes SemanticWorkbenchState", () => {
    const htmlPath = path.resolve(
      import.meta.dir,
      "../../..",
      "workbenches",
      "prompt-to-dtc-semantic-flow.html",
    );
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('id="semantic-workbench-state"');
    expect(html).toContain("window.semanticWorkbenchState");
    expect(html).toContain("__PALANTIR_MINI_SEMANTIC_WORKBENCH_STATE__");
    expect(html).toContain(SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION);
    expect(html).toContain("ontologyPreview");
    expect(html).toContain("nextAllowedActions");
  });
});
