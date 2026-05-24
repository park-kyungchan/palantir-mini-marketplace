/**
 * workbench-state-dtc-panel.test.ts
 *
 * Tests for the ADDITIVE DTC panel extension in workbench-state.ts.
 *
 * INVARIANTS verified:
 *   1. BACKWARD-COMPAT: absent dtcSession → dtcPanel key absent (byte-identical output)
 *   2. dtcSession present + in-progress turn → dtcPanel populated + reviewCards pre-empted
 *   3. dtcSession in-progress → defaultNextAllowedActions returns DTC fill action set
 *   4. dtcSession dtc-approved → falls through to existing behavior
 */
import { describe, expect, test } from "bun:test";
import {
  SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION,
  buildSemanticWorkbenchState,
} from "../../../lib/chatbot-studio/workbench-state";
import type { SemanticConversationState } from "../../../lib/chatbot-studio/semantic-conversation-state";
import type { DtcFillSequenceSession } from "../../../lib/chatbot-studio/dtc-fill-session";
import { DTC_FILL_SEQUENCE_SESSION_SCHEMA_VERSION } from "../../../lib/chatbot-studio/dtc-fill-session";
import { DTC_FILL_SEQUENCE } from "../../../lib/semantic-intent/fill-sequence";
import type { DtcWithFillFields } from "../../../lib/semantic-intent/dtc-fill-sequence";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function minimalConversation(
  overrides: Partial<SemanticConversationState> = {},
): SemanticConversationState {
  return {
    stateId: "semantic-conversation:dtc-panel-test",
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: { promptId: "p1", sessionId: "s1", runtime: "claude" },
    userFacing: {
      preferredLanguage: "en",
      userExpertise: "non_programmer",
      plainRequestSummary: "DTC panel backward-compat test fixture",
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
      projectRoot: "/home/palantirkc",
      projectScopeLaneIds: [],
      requiredValidationPacks: [],
    },
    lifecycle: "clarifying",
    ...overrides,
  };
}

function makeDtcDraft(overrides: Partial<DtcWithFillFields> = {}): DtcWithFillFields {
  return {
    contractId: "dtc-test-001",
    status: "draft",
    theme: "test-change",
    changeBoundary: { affectedSurfaces: [] },
    approvedNouns: [],
    approvedVerbs: [],
    nonGoals: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    supportingResearchRefs: [],
    gradeRubricRid: undefined,
    ...overrides,
  } as unknown as DtcWithFillFields;
}

function dtcSession(
  overrides: Partial<DtcFillSequenceSession> = {},
): DtcFillSequenceSession {
  return {
    schemaVersion: DTC_FILL_SEQUENCE_SESSION_SCHEMA_VERSION,
    sessionId: "sess-dtc-panel-test",
    contractId: "dtc-test-001",
    fillSequenceId: "fill-seq-001",
    currentTurnIndex: -1,
    completedTurns: [],
    dtcDraft: makeDtcDraft(),
    startedAt: "2026-05-15T00:00:00.000Z",
    lastTurnAt: "2026-05-15T00:00:00.000Z",
    fillVerdict: "draft",
    mutationAuthorized: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. BACKWARD-COMPAT: absent dtcSession → dtcPanel key absent
// ---------------------------------------------------------------------------

describe("workbench-state DTC panel — backward-compat", () => {
  test("WITHOUT dtcSession input — dtcPanel key absent (byte-identical legacy output)", () => {
    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
    });

    // CRITICAL: 'dtcPanel' key must NOT appear in Object.keys()
    expect(Object.keys(state)).not.toContain("dtcPanel");
    expect((state as unknown as Record<string, unknown>)["dtcPanel"]).toBeUndefined();

    // All legacy fields present
    expect(state.schemaVersion).toBe(SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION);
    expect(state.conversation).toBeDefined();
    expect(state.reviewCards).toBeDefined();
    expect(state.ontologyPreview).toBeDefined();
    expect(state.impactPreview).toBeDefined();
    expect(state.issuePreview).toBeDefined();
    expect(state.validationPreview).toBeDefined();
    expect(state.candidateSkills).toBeDefined();
    expect(state.selectedSkills).toBeDefined();
    expect(state.rejectedSkills).toBeDefined();
    expect(state.nextAllowedActions).toBeDefined();
  });

  test("WITHOUT dtcSession — nextAllowedActions follows existing conversation-based logic", () => {
    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation({
        contractFacing: { dtcReady: false },
        lifecycle: "clarifying",
        userFacing: {
          preferredLanguage: "en",
          userExpertise: "non_programmer",
          plainRequestSummary: "test",
          confirmedNonGoals: [],
          unresolvedQuestions: [
            {
              questionId: "q1",
              plainQuestion: "Clarify intent?",
              whyItMatters: "matters",
              recommendedAnswer: "yes",
              whatWillNotHappen: [],
              materiality: "blocking",
            },
          ],
        },
      }),
    });

    expect(state.nextAllowedActions).toEqual([
      "answer-clarification",
      "revise-semantic-meaning",
      "hold-before-dtc",
    ]);
    // dtcPanel still absent
    expect(Object.keys(state)).not.toContain("dtcPanel");
  });
});

// ---------------------------------------------------------------------------
// 2. dtcSession present + currentTurnIndex=2 → dtcPanel populated; reviewCards pre-empted
// ---------------------------------------------------------------------------

describe("workbench-state DTC panel — in-progress turn", () => {
  test("dtcSession with currentTurnIndex=2 → dtcPanel populated", () => {
    const sess = dtcSession({
      currentTurnIndex: 2,
      completedTurns: [0, 1],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    expect(state.dtcPanel).toBeDefined();
    expect(Object.keys(state)).toContain("dtcPanel");
    const panel = state.dtcPanel!;
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
    expect(panel.turnIndex).toBe(2);
    expect(panel.completedTurns).toEqual([0, 1]);
  });

  test("dtcSession currentTurnIndex=2 → reviewCards[0].title === 'DTC Turn 3 of 7'", () => {
    const sess = dtcSession({
      currentTurnIndex: 2,
      completedTurns: [0, 1],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    expect(state.reviewCards).toHaveLength(1);
    expect(state.reviewCards[0]?.title).toBe(`DTC Turn 3 of ${DTC_FILL_SEQUENCE.length}`);
    expect(state.reviewCards[0]?.plainSummary).toBe(DTC_FILL_SEQUENCE[2]!.question);
  });

  test("dtcSession currentTurnIndex=0 → reviewCards[0].title === 'DTC Turn 1 of 7'", () => {
    const sess = dtcSession({
      currentTurnIndex: 0,
      completedTurns: [],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    expect(state.reviewCards[0]?.title).toBe(`DTC Turn 1 of ${DTC_FILL_SEQUENCE.length}`);
    expect(state.reviewCards[0]?.plainSummary).toBe(DTC_FILL_SEQUENCE[0]!.question);
  });

  test("DTC turn card has 3 choices: 'Answer this turn', 'Agent auto-fill', 'Hold DTC fill'", () => {
    const sess = dtcSession({
      currentTurnIndex: 1,
      completedTurns: [0],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    const card = state.reviewCards[0]!;
    expect(card.choices).toHaveLength(3);
    expect(card.choices[0]?.label).toBe("Answer this turn");
    expect(card.choices[1]?.label).toBe("Agent auto-fill");
    expect(card.choices[2]?.label).toBe("Hold DTC fill");
  });

  test("dtcPanel.mutationAuthorizedFromPanel is always false", () => {
    const sess = dtcSession({
      currentTurnIndex: 3,
      completedTurns: [0, 1, 2],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    expect(state.dtcPanel?.mutationAuthorizedFromPanel).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. dtcSession in-progress → nextAllowedActions returns DTC fill action set
// ---------------------------------------------------------------------------

describe("workbench-state DTC panel — nextAllowedActions", () => {
  test("dtcSession in-progress → DTC fill action set", () => {
    const sess = dtcSession({
      currentTurnIndex: 2,
      completedTurns: [0, 1],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    expect(state.nextAllowedActions).toEqual([
      "answer-dtc-turn",
      "revise-dtc-turn",
      "dtc-auto-fill-remaining",
      "hold-dtc-fill",
    ]);
  });

  test("dtcSession not-started (completedTurns empty, fillVerdict=draft) → DTC fill action set", () => {
    const sess = dtcSession({
      currentTurnIndex: -1,
      completedTurns: [],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    // completedTurns.length (0) < DTC_FILL_SEQUENCE.length (7), so DTC path taken
    expect(state.nextAllowedActions).toEqual([
      "answer-dtc-turn",
      "revise-dtc-turn",
      "dtc-auto-fill-remaining",
      "hold-dtc-fill",
    ]);
  });

  test("input.nextAllowedActions override respected even with dtcSession", () => {
    const sess = dtcSession({
      currentTurnIndex: 2,
      completedTurns: [0, 1],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
      nextAllowedActions: ["custom-override-action"],
    });

    expect(state.nextAllowedActions).toEqual(["custom-override-action"]);
  });
});

// ---------------------------------------------------------------------------
// 4. dtcSession dtc-approved → falls through to existing behavior
// ---------------------------------------------------------------------------

describe("workbench-state DTC panel — dtc-approved fallthrough", () => {
  test("dtcSession fillVerdict=dtc-approved → reviewCards NOT pre-empted by DTC turn", () => {
    const sess = dtcSession({
      currentTurnIndex: -1,
      completedTurns: [0, 1, 2, 3, 4, 5, 6],
      fillVerdict: "dtc-approved",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation({
        contractFacing: { dtcReady: false },
        lifecycle: "dtc-drafted",
      }),
      dtcSession: sess,
    });

    // DTC-approved session should NOT produce a "DTC Turn" card
    expect(state.reviewCards.every((card) => !card.title.startsWith("DTC Turn"))).toBe(true);
  });

  test("dtcSession fillVerdict=dtc-approved → nextAllowedActions falls through to existing logic", () => {
    const sess = dtcSession({
      currentTurnIndex: -1,
      completedTurns: [0, 1, 2, 3, 4, 5, 6],
      fillVerdict: "dtc-approved",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation({
        contractFacing: { dtcReady: false },
        lifecycle: "dtc-drafted",
      }),
      dtcSession: sess,
    });

    // completedTurns.length === DTC_FILL_SEQUENCE.length, so DTC gate bypassed
    // falls through to conversation-based logic
    expect(state.nextAllowedActions).not.toContain("answer-dtc-turn");
    expect(state.nextAllowedActions).not.toContain("hold-dtc-fill");
  });

  test("dtcSession all-turns-done + dtc-approved → dtcPanel still populated", () => {
    const sess = dtcSession({
      currentTurnIndex: -1,
      completedTurns: [0, 1, 2, 3, 4, 5, 6],
      fillVerdict: "dtc-approved",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      dtcSession: sess,
    });

    // dtcPanel key IS present when session supplied (even for dtc-approved)
    expect(Object.keys(state)).toContain("dtcPanel");
    expect(state.dtcPanel?.status).toBe("dtc-approved");
    expect(state.dtcPanel?.mutationAuthorizedFromPanel).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. DTC turn card pre-empts existing review cards
// ---------------------------------------------------------------------------

describe("workbench-state DTC panel — pre-emption of existing review logic", () => {
  test("dtcSession active + conversation has unresolved questions → DTC turn card wins", () => {
    const sess = dtcSession({
      currentTurnIndex: 1,
      completedTurns: [0],
      fillVerdict: "draft",
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation({
        userFacing: {
          preferredLanguage: "en",
          userExpertise: "non_programmer",
          plainRequestSummary: "test",
          confirmedNonGoals: [],
          unresolvedQuestions: [
            {
              questionId: "q1",
              plainQuestion: "Any clarification?",
              whyItMatters: "matters",
              recommendedAnswer: "yes",
              whatWillNotHappen: [],
              materiality: "important",
            },
          ],
        },
      }),
      dtcSession: sess,
    });

    // DTC turn card pre-empts — only 1 card, and it's the DTC turn card
    expect(state.reviewCards).toHaveLength(1);
    expect(state.reviewCards[0]?.title).toBe(`DTC Turn 2 of ${DTC_FILL_SEQUENCE.length}`);
  });
});
