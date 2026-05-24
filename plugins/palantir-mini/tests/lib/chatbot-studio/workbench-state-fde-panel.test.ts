import { describe, expect, test } from "bun:test";
import {
  SEMANTIC_WORKBENCH_STATE_SCHEMA_VERSION,
  buildSemanticWorkbenchState,
} from "../../../lib/chatbot-studio/workbench-state";
import type { SemanticConversationState } from "../../../lib/chatbot-studio/semantic-conversation-state";
import type { FDEOntologyBuildSession } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import { FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function minimalConversation(
  overrides: Partial<SemanticConversationState> = {},
): SemanticConversationState {
  return {
    stateId: "semantic-conversation:fde-panel-test",
    schemaVersion: "palantir-mini/semantic-conversation-state/v1",
    prompt: { promptId: "p1", sessionId: "s1", runtime: "claude" },
    userFacing: {
      preferredLanguage: "en",
      userExpertise: "non_programmer",
      plainRequestSummary: "FDE panel backward-compat test fixture",
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

function minimalFDESession(
  overrides: Partial<FDEOntologyBuildSession> = {},
): FDEOntologyBuildSession {
  return {
    schemaVersion: FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION,
    sessionRid: "fde-session:test-001",
    project: "palantir-mini",
    composedAt: "2026-05-14T00:00:00.000Z",
    mutationAuthorized: false,
    readOnly: true,
    readiness: "not-ready",
    requiresDigitalTwinChangeContract: false,
    plainLanguageStatus: "not-ready",
    objectTypes: [],
    linkTypes: [],
    actionWriteback: [],
    functions: [],
    chatbotStudio: [],
    completedLevels: [],
    topGaps: [],
    allGaps: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("workbench-state FDE panel backward-compat", () => {
  test("WITHOUT fdeSession input — fdePanel key absent (byte-identical legacy output)", () => {
    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
    });

    // CRITICAL: 'fdePanel' key must NOT be in Object.keys()
    expect(Object.keys(state)).not.toContain("fdePanel");
    expect((state as unknown as Record<string, unknown>)["fdePanel"]).toBeUndefined();

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
    expect(state.candidateCapabilities).toBeDefined();
    expect(state.selectedCapabilities).toBeDefined();
    expect(state.rejectedCapabilities).toBeDefined();
    expect(state.nextAllowedActions).toBeDefined();
  });

  test("WITH fdeSession readiness=not-ready → fdePanel populated; readOnly:true, dtcNeededNow:false, semanticApprovalReady:false", () => {
    const session = minimalFDESession({ readiness: "not-ready", readOnly: true });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      fdeSession: session,
    });

    expect(state.fdePanel).toBeDefined();
    const panel = state.fdePanel!;

    expect(panel.readiness).toBe("not-ready");
    expect(panel.readOnly).toBe(true);
    expect(panel.semanticApprovalReady).toBe(false);
    expect(panel.dtcNeededNow).toBe(false);
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
    expect(panel.currentLevel).toBe("none");
    expect(panel.completedLevels).toEqual([]);
    expect(panel.topGaps).toEqual([]);
    // key IS present when fdeSession provided
    expect(Object.keys(state)).toContain("fdePanel");
  });

  test("WITH fdeSession readiness=ready-for-semantic-approval + SIC approved → semanticApprovalReady:true, dtcNeededNow:true (no DTC yet)", () => {
    const session = minimalFDESession({
      readiness: "ready-for-semantic-approval",
      readOnly: false,
      completedLevels: [
        "mission-decision",
        "object-type",
        "link-type",
        "action-writeback",
        "function",
        "chatbot-studio",
        "ai-fde-mcp-boundary",
        "branch-release",
        "eval-observability",
      ],
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      fdeSession: session,
      fdePanelHints: {
        hasApprovedSemanticIntentContract: true,
        hasApprovedDigitalTwinChangeContract: false,
        preferredLanguage: "en",
      },
    });

    expect(state.fdePanel).toBeDefined();
    const panel = state.fdePanel!;

    expect(panel.readiness).toBe("ready-for-semantic-approval");
    expect(panel.readOnly).toBe(false);
    expect(panel.semanticApprovalReady).toBe(true);
    expect(panel.dtcNeededNow).toBe(true);
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
    expect(panel.currentLevel).toBe("eval-observability");
    expect(panel.completedLevels).toHaveLength(9);
    expect(panel.plainLanguageStatus).toContain("SIC");
  });

  test("WITH fdeSession readiness=ready-for-semantic-approval + both SIC and DTC approved → dtcNeededNow:false", () => {
    const session = minimalFDESession({
      readiness: "ready-for-semantic-approval",
      readOnly: false,
    });

    const state = buildSemanticWorkbenchState({
      conversation: minimalConversation(),
      fdeSession: session,
      fdePanelHints: {
        hasApprovedSemanticIntentContract: true,
        hasApprovedDigitalTwinChangeContract: true,
      },
    });

    const panel = state.fdePanel!;
    expect(panel.semanticApprovalReady).toBe(true);
    expect(panel.dtcNeededNow).toBe(false);
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });
});
