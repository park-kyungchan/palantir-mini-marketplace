import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import {
  buildSemanticConversationState,
} from "../../../lib/chatbot-studio/semantic-conversation-state";
import {
  buildApplicationStateFromConversation,
} from "../../../lib/chatbot-studio/application-state";
import {
  buildRetrievalContextFromConversation,
} from "../../../lib/chatbot-studio/retrieval-context";
import { buildLayer0IntentBridge } from "../../../lib/context-engineering/intent-bridge";
import type { ContractGateResult, DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";
import { DTC_FILL_SEQUENCE } from "../../../lib/semantic-intent/fill-sequence";
import type { DtcWithFillFields } from "../../../lib/semantic-intent/dtc-fill-sequence";

function gate(overrides: Partial<ContractGateResult> = {}): ContractGateResult {
  return {
    status: "contract_required",
    allowsRouting: false,
    reason: "Contract required",
    contractPolicy: "approval-required",
    riskClass: "digital-twin",
    requiredContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    recommendedContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    questions: [],
    semanticIntent: { valid: false, issues: [] },
    digitalTwin: { valid: false, issues: [] },
    ...overrides,
  };
}

describe("SemanticConversationState", () => {
  test("captures user-facing questions before DTC approval", () => {
    const bridge = buildLayer0IntentBridge({
      rawIntent: "Connect problem 15 lecture trace to review video handoff",
      projectRoot: "/tmp/palantir-math",
      scopePaths: ["src/lib/learningTrace/types.ts"],
      promptId: "prompt-1",
      promptHash: "hash-1",
      sessionId: "session-1",
    });

    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/palantir-math",
        rawIntent: "Connect problem 15 lecture trace to review video handoff",
        promptId: "prompt-1",
        promptHash: "hash-1",
        sessionId: "session-1",
        runtime: "codex",
        preferredLanguage: "ko",
        userExpertise: "non_programmer",
      },
      gate: gate(),
      bridge,
      turnCardDecisionQueue: [
        {
          questionId: "semantic-intent.confirm-operational-meaning",
          materiality: "blocking",
          decisionSpec: {
            plainKoreanSummary: "Confirm meaning",
            recommendedChoiceId: "confirm",
            choices: [{ choiceId: "confirm", consequence: "Confirm the user-approved meaning first." }],
          },
          whyItMatters: "Raw prompt text is not enough to route implementation.",
          whatWillNotHappen: ["No runtime mutation starts from a guess."],
        },
      ],
      userReviewCard: {
        plainSummary: "제가 이해한 요청은 problem 15 lecture trace handoff입니다.",
        questions: [
          {
            questionId: "semantic-intent.confirm-operational-meaning",
            plainQuestion: "이 의미가 맞습니까?",
            whyItMatters: "사용자 의미가 승인되어야 합니다.",
            recommendedAnswer: "네. 이 의미를 승인합니다.",
          },
        ],
      },
    });

    expect(state.schemaVersion).toBe("palantir-mini/semantic-conversation-state/v1");
    expect(state.lifecycle).toBe("clarifying");
    expect(state.contractFacing.dtcReady).toBe(false);
    expect(state.userFacing.unresolvedQuestions[0]?.plainQuestion).toBe("이 의미가 맞습니까?");
    expect(state.projectFacing.projectScopeLaneIds).toContain("aip-3-context-engineering");
  });

  test("projects conversation state into application and retrieval context", () => {
    const bridge = buildLayer0IntentBridge({
      rawIntent: "Approved plan",
      projectRoot: "/tmp/project",
      scopePaths: ["lib/chatbot-studio/semantic-conversation-state.ts"],
    });

    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/project",
        rawIntent: "Approved plan",
        runtime: "codex",
      },
      gate: gate({
        status: "pass",
        allowsRouting: true,
        semanticIntent: { valid: true, issues: [] },
        digitalTwin: { valid: true, issues: [] },
      }),
      bridge,
      turnCardDecisionQueue: [],
      contractRefs: {
        semanticIntentContractRef: "semantic:test",
        digitalTwinChangeContractRef: "dtc:test",
        approvalRef: "user:approved",
      },
      universalEntryRef: "universal-entry:test",
      ontologyContextRef: "ontology-context-query:test",
      candidateSkills: [{ skillId: "palantir-math-expert" }],
      selectedSkills: [{ skillId: "palantir-math-expert" }],
      rejectedSkills: [{ skillId: "sequencer-math", reason: "requires approved solution.md" }],
      impactFacing: {
        directSurfaceRefs: ["lib/chatbot-studio/semantic-conversation-state.ts"],
        downstreamSurfaceRefs: ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
        confidence: "high",
      },
      issueFacing: {
        knownIssueIds: ["semantic-workbench-projection-only"],
        warnings: ["low: Projection only - Approval write-back is not implemented."],
      },
      validationFacing: {
        requiredValidationPacks: ["chatbot-studio-semantic-state"],
        suggestedCommands: ["bun test tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
      },
    });

    const appState = buildApplicationStateFromConversation(state);
    const retrievalContext = buildRetrievalContextFromConversation(state);

    expect(state.lifecycle).toBe("dtc-approved");
    expect(state.llmControlFacing).toMatchObject({
      stateSource: "SemanticConversationState",
      writableByModel: false,
      readinessWritableByModel: false,
      approvalWritableByModel: false,
    });
    expect(state.llmControlFacing.prohibitedWriteFields).toContain("contractFacing.dtcReady");
    expect(state.llmControlFacing.prohibitedWriteFields).toContain("contractFacing.approvalRef");
    expect(appState.variables.every((variable) => variable.writableByModel === false)).toBe(true);
    expect(appState.variables.every((variable) =>
      variable.sourceStateKind === "SemanticConversationState"
    )).toBe(true);
    expect(appState.variables.find((variable) => variable.variableId === "semantic.control.dtcReady")?.visibleToModel)
      .toBe(false);
    expect(appState.variables.filter((variable) => variable.visibleToModel).map((variable) => variable.variableId))
      .not.toContain("semantic.approval.dtcReady");
    expect(appState.variables.find((variable) => variable.variableId === "semantic.lifecycle")?.value)
      .toBe("dtc-approved");
    expect(appState.variables.find((variable) => variable.variableId === "semantic.impact.directSurfaces")?.value)
      .toEqual(["lib/chatbot-studio/semantic-conversation-state.ts"]);
    expect(retrievalContext.sourceRefs).toEqual([
      "universal-entry:test",
      "ontology-context-query:test",
      "semantic:test",
      "dtc:test",
    ]);
    expect(retrievalContext.skillRefs).toEqual(["palantir-math-expert"]);
    expect(retrievalContext.retrievedPrompt).toContain(
      "Control state source: SemanticConversationState",
    );
    expect(retrievalContext.retrievedPrompt).toContain(
      "Model writes to readiness/approval: denied",
    );
    expect(retrievalContext.retrievedPrompt).toContain(
      "DTC readiness: ready (plugin-derived, read-only)",
    );
    expect(retrievalContext.retrievedPrompt).toContain("Known issues: semantic-workbench-projection-only");
  });

  test("schema locks LLM control fields to read-only SemanticConversationState projection", () => {
    const schema = JSON.parse(
      fs.readFileSync("schemas/semantic-conversation-state.schema.json", "utf8"),
    ) as {
      properties?: Record<string, unknown>;
      $defs?: {
        llmControlFacing?: {
          properties?: Record<string, { const?: unknown; contains?: unknown }>;
        };
      };
    };
    const llmControl = schema.$defs?.llmControlFacing?.properties ?? {};

    expect(schema.properties?.llmControlFacing).toEqual({
      "$ref": "#/$defs/llmControlFacing",
    });
    expect(llmControl.stateSource?.const).toBe("SemanticConversationState");
    expect(llmControl.writableByModel?.const).toBe(false);
    expect(llmControl.readinessWritableByModel?.const).toBe(false);
    expect(llmControl.approvalWritableByModel?.const).toBe(false);
    expect(llmControl.prohibitedWriteFields?.contains).toEqual({
      const: "contractFacing.dtcReady",
    });
  });
});

// ---------------------------------------------------------------------------
// DTC fill lifecycle + contractFacing extension tests
// ---------------------------------------------------------------------------

function gateBase(overrides: Partial<ContractGateResult> = {}): ContractGateResult {
  return {
    status: "contract_required",
    allowsRouting: false,
    reason: "Contract required",
    contractPolicy: "approval-required",
    riskClass: "digital-twin",
    requiredContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    recommendedContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    questions: [],
    semanticIntent: { valid: false, issues: [] },
    digitalTwin: { valid: false, issues: [] },
    ...overrides,
  };
}

function bridgeBase() {
  return buildLayer0IntentBridge({
    rawIntent: "DTC fill test",
    projectRoot: "/tmp/dtc-test",
    scopePaths: ["lib/chatbot-studio/workbench-state.ts"],
  });
}

function makeDtcWithFillFields(
  overrides: Partial<DtcWithFillFields> = {},
): DtcWithFillFields {
  return {
    contractId: "dtc-fill-test-001",
    status: "draft",
    theme: "test-change",
    changeBoundary: { affectedSurfaces: [] },
    approvedNouns: [],
    approvedVerbs: [],
    nonGoals: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    supportingResearchRefs: [],
    ...overrides,
  } as unknown as DtcWithFillFields;
}

describe("SemanticConversationState — DTC fill lifecycle", () => {
  test("lifecycle='dtc-fill-in-progress' when dtcFillSequence.length > 0 and < 7", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "DTC fill in progress test",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      digitalTwinChangeContract: makeDtcWithFillFields({
        dtcFillSequence: [
          {
            step: 1,
            question: DTC_FILL_SEQUENCE[0]!.question,
            filledAt: "2026-05-15T00:00:00.000Z",
            source: "user",
          },
          {
            step: 2,
            question: DTC_FILL_SEQUENCE[1]!.question,
            filledAt: "2026-05-15T00:01:00.000Z",
            source: "user",
          },
        ],
      }),
    });

    expect(state.lifecycle).toBe("dtc-fill-in-progress");
  });

  test("lifecycle='dtc-fill-in-progress' when verdict=dtc-filled and gate.digitalTwin.valid=false", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "DTC fill verdict test",
      },
      gate: gateBase({ digitalTwin: { valid: false, issues: [] } }),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      digitalTwinChangeContract: makeDtcWithFillFields({
        verdict: "dtc-filled",
      }),
    });

    expect(state.lifecycle).toBe("dtc-fill-in-progress");
  });

  test("BACKWARD-COMPAT: no DTC inputs → lifecycle derivation unchanged (captured)", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "plain intent no DTC",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
    });

    expect(state.lifecycle).toBe("captured");
  });

  test("BACKWARD-COMPAT: clarifying lifecycle preserved when questions present", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "intent with questions",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [
        {
          questionId: "q1",
          materiality: "blocking",
          decisionSpec: {
            plainKoreanSummary: "Clarify?",
            recommendedChoiceId: "yes",
            choices: [{ choiceId: "yes", consequence: "Yes." }],
          },
          whyItMatters: "matters",
          whatWillNotHappen: [],
        },
      ],
    });

    expect(state.lifecycle).toBe("clarifying");
  });

  test("BACKWARD-COMPAT: dtc-approved lifecycle preserved when gate allows routing + dtc valid", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "fully approved intent",
      },
      gate: gateBase({
        status: "pass",
        allowsRouting: true,
        semanticIntent: { valid: true, issues: [] },
        digitalTwin: { valid: true, issues: [] },
      }),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      contractRefs: {
        semanticIntentContractRef: "sic:test",
        digitalTwinChangeContractRef: "dtc:test",
        approvalRef: "user:approved",
      },
    });

    expect(state.lifecycle).toBe("dtc-approved");
  });
});

describe("SemanticConversationState — DTC fill contractFacing", () => {
  test("dtcFillTurnsCompleted surfaced from dtcFillSequence.length", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "DTC fill turns test",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      digitalTwinChangeContract: makeDtcWithFillFields({
        dtcFillSequence: [
          {
            step: 1,
            filledAt: "2026-05-15T00:00:00.000Z",
            source: "user",
          },
          {
            step: 2,
            filledAt: "2026-05-15T00:01:00.000Z",
            source: "agent",
          },
          {
            step: 3,
            filledAt: "2026-05-15T00:02:00.000Z",
            source: "user",
          },
        ],
      }),
    });

    expect(state.contractFacing.dtcFillTurnsCompleted).toBe(3);
  });

  test("dtcFillNextQuestion surfaced from DTC_FILL_SEQUENCE[turnsCompleted].question", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "DTC fill next question test",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      digitalTwinChangeContract: makeDtcWithFillFields({
        dtcFillSequence: [
          { step: 1, filledAt: "2026-05-15T00:00:00.000Z", source: "user" },
        ],
      }),
    });

    // After 1 turn completed, next question is DTC_FILL_SEQUENCE[1].question
    expect(state.contractFacing.dtcFillNextQuestion).toBe(DTC_FILL_SEQUENCE[1]!.question);
  });

  test("dtcFillNextQuestion absent when all 7 turns completed", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "DTC fill complete test",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      digitalTwinChangeContract: makeDtcWithFillFields({
        dtcFillSequence: Array.from({ length: DTC_FILL_SEQUENCE.length }, (_, i) => ({
          step: i + 1,
          filledAt: "2026-05-15T00:00:00.000Z",
          source: "user" as const,
        })),
      }),
    });

    // All turns done; DTC_FILL_SEQUENCE[7] doesn't exist → no next question
    expect(state.contractFacing.dtcFillTurnsCompleted).toBe(DTC_FILL_SEQUENCE.length);
    expect(state.contractFacing.dtcFillNextQuestion).toBeUndefined();
  });

  test("BACKWARD-COMPAT: no digitalTwinChangeContract → dtcFill fields absent", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "no DTC",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
    });

    expect(state.contractFacing.dtcFillTurnsCompleted).toBeUndefined();
    expect(state.contractFacing.dtcFillNextQuestion).toBeUndefined();
    expect(state.contractFacing.dtcFillUnresolvedTerms).toBeUndefined();
  });

  test("BACKWARD-COMPAT: digitalTwinChangeContract without dtcFillSequence → dtcFill fields absent", () => {
    const state = buildSemanticConversationState({
      gateInput: {
        project: "/tmp/dtc-test",
        rawIntent: "DTC without fill",
      },
      gate: gateBase(),
      bridge: bridgeBase(),
      turnCardDecisionQueue: [],
      digitalTwinChangeContract: makeDtcWithFillFields(),
      // no dtcFillSequence field
    });

    expect(state.contractFacing.dtcFillTurnsCompleted).toBeUndefined();
    expect(state.contractFacing.dtcFillNextQuestion).toBeUndefined();
  });
});
