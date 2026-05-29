import { describe, expect, test } from "bun:test";
import { buildFDEPanel } from "../../../lib/chatbot-studio/fde-panel-builder";
import type { FDEOntologyBuildSession } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import { FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import { FDE_PANEL_SCHEMA_VERSION } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-panel";

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

const ALL_LEVELS = [
  "mission-decision",
  "object-type",
  "link-type",
  "action-writeback",
  "function",
  "chatbot-studio",
  "ai-fde-mcp-boundary",
  "branch-release",
  "eval-observability",
] as const;

function session(
  overrides: Partial<FDEOntologyBuildSession> = {},
): FDEOntologyBuildSession {
  return {
    schemaVersion: FDE_ONTOLOGY_BUILD_SESSION_SCHEMA_VERSION,
    sessionRid: "fde-session:builder-test",
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
// Schema + invariants
// ---------------------------------------------------------------------------

describe("buildFDEPanel — schema invariants", () => {
  test("output carries correct schemaVersion", () => {
    const panel = buildFDEPanel({ session: session() });
    expect(panel.schemaVersion).toBe(FDE_PANEL_SCHEMA_VERSION);
  });

  test("mutationAuthorizedFromPanel is always false", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: false }),
      hints: {
        hasApprovedSemanticIntentContract: true,
        hasApprovedDigitalTwinChangeContract: true,
      },
    });
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });

  test("composedAt uses provided nowIso", () => {
    const panel = buildFDEPanel({
      session: session(),
      nowIso: "2026-01-01T12:00:00.000Z",
    });
    expect(panel.composedAt).toBe("2026-01-01T12:00:00.000Z");
  });

  test("composedAt falls back to real timestamp when nowIso absent", () => {
    const before = new Date().toISOString();
    const panel = buildFDEPanel({ session: session() });
    const after = new Date().toISOString();
    expect(panel.composedAt >= before).toBe(true);
    expect(panel.composedAt <= after).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// currentLevel derivation
// ---------------------------------------------------------------------------

describe("buildFDEPanel — currentLevel", () => {
  test("no completedLevels → currentLevel = 'none'", () => {
    const panel = buildFDEPanel({ session: session({ completedLevels: [] }) });
    expect(panel.currentLevel).toBe("none");
  });

  test("completedLevels with 1 entry → currentLevel = that entry", () => {
    const panel = buildFDEPanel({
      session: session({ completedLevels: ["mission-decision"] }),
    });
    expect(panel.currentLevel).toBe("mission-decision");
  });

  test("all 9 levels completed → currentLevel = 'eval-observability' (last)", () => {
    const panel = buildFDEPanel({
      session: session({ completedLevels: [...ALL_LEVELS] }),
    });
    expect(panel.currentLevel).toBe("eval-observability");
  });

  test("completedLevels array is copied (not mutated by session)", () => {
    const levels = ["mission-decision", "object-type"] as const;
    const s = session({ completedLevels: [...levels] });
    const panel = buildFDEPanel({ session: s });
    expect(panel.completedLevels).toEqual(["mission-decision", "object-type"]);
    // completedLevels in panel is a different array reference
    expect(panel.completedLevels).not.toBe(s.completedLevels);
  });
});

// ---------------------------------------------------------------------------
// missionDecisionSummary
// ---------------------------------------------------------------------------

describe("buildFDEPanel — missionDecisionSummary", () => {
  test("no missionDecision → empty string", () => {
    const panel = buildFDEPanel({ session: session() });
    expect(panel.missionDecisionSummary).toBe("");
  });

  test("useCaseName only → returns useCaseName", () => {
    const panel = buildFDEPanel({
      session: session({
        missionDecision: { useCaseName: "Incident Triage Assistant" },
      }),
    });
    expect(panel.missionDecisionSummary).toBe("Incident Triage Assistant");
  });

  test("useCaseName + operationalDecision → joined with ' — '", () => {
    const panel = buildFDEPanel({
      session: session({
        missionDecision: {
          useCaseName: "Incident Triage",
          operationalDecision: "Which incidents need immediate escalation?",
        },
      }),
    });
    expect(panel.missionDecisionSummary).toBe(
      "Incident Triage — Which incidents need immediate escalation?",
    );
  });
});

// ---------------------------------------------------------------------------
// topGaps mapping
// ---------------------------------------------------------------------------

describe("buildFDEPanel — topGaps", () => {
  test("no topGaps → empty array", () => {
    const panel = buildFDEPanel({ session: session({ topGaps: [] }) });
    expect(panel.topGaps).toEqual([]);
  });

  test("topGaps capped at 5", () => {
    const gaps = Array.from({ length: 8 }, (_, i) => ({
      gapId: `gap-${i}`,
      level: "mission-decision" as const,
      severity: "low" as const,
      description: `Gap ${i}`,
    }));
    const panel = buildFDEPanel({ session: session({ topGaps: gaps }) });
    expect(panel.topGaps).toHaveLength(5);
  });

  test("gap shape is correctly mapped", () => {
    const panel = buildFDEPanel({
      session: session({
        topGaps: [
          {
            gapId: "g1",
            level: "object-type",
            severity: "high",
            description: "Primary key missing",
            nextQuestion: "What uniquely identifies this object?",
          },
        ],
      }),
    });
    expect(panel.topGaps[0]).toEqual({
      gapId: "g1",
      level: "object-type",
      severity: "high",
      description: "Primary key missing",
      nextQuestion: "What uniquely identifies this object?",
    });
  });

  test("gap without nextQuestion has no nextQuestion key", () => {
    const panel = buildFDEPanel({
      session: session({
        topGaps: [
          {
            gapId: "g2",
            level: "link-type",
            severity: "medium",
            description: "Cardinality undefined",
          },
        ],
      }),
    });
    expect("nextQuestion" in panel.topGaps[0]!).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readOnly + semanticApprovalReady + dtcNeededNow
// ---------------------------------------------------------------------------

describe("buildFDEPanel — readOnly / semanticApprovalReady / dtcNeededNow", () => {
  test("not-ready verdict → readOnly:true, semanticApprovalReady:false, dtcNeededNow:false", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "not-ready", readOnly: true }),
      hints: { hasApprovedSemanticIntentContract: true },
    });
    expect(panel.readOnly).toBe(true);
    expect(panel.semanticApprovalReady).toBe(false);
    expect(panel.dtcNeededNow).toBe(false);
  });

  test("ready-for-semantic-approval WITHOUT SIC hint → readOnly:true, semanticApprovalReady:false", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: false }),
      hints: { hasApprovedSemanticIntentContract: false },
    });
    expect(panel.readOnly).toBe(true);
    expect(panel.semanticApprovalReady).toBe(false);
    expect(panel.dtcNeededNow).toBe(false);
  });

  test("ready-for-semantic-approval + SIC approved → readOnly:false, semanticApprovalReady:true, dtcNeededNow:true (no DTC)", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: false }),
      hints: {
        hasApprovedSemanticIntentContract: true,
        hasApprovedDigitalTwinChangeContract: false,
      },
    });
    expect(panel.readOnly).toBe(false);
    expect(panel.semanticApprovalReady).toBe(true);
    expect(panel.dtcNeededNow).toBe(true);
  });

  test("ready-for-semantic-approval + SIC + DTC both approved → dtcNeededNow:false", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: false }),
      hints: {
        hasApprovedSemanticIntentContract: true,
        hasApprovedDigitalTwinChangeContract: true,
      },
    });
    expect(panel.semanticApprovalReady).toBe(true);
    expect(panel.dtcNeededNow).toBe(false);
  });

  test("session.readOnly=true overrides even if readiness=ready-for-semantic-approval", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: true }),
      hints: { hasApprovedSemanticIntentContract: true },
    });
    expect(panel.readOnly).toBe(true);
    // semanticApprovalReady still checks only readiness + SIC hint, not panel.readOnly
    expect(panel.semanticApprovalReady).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// plainLanguageStatus — Korean vs English
// ---------------------------------------------------------------------------

describe("buildFDEPanel — plainLanguageStatus language", () => {
  test("Korean output for not-ready verdict", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "not-ready" }),
      hints: { preferredLanguage: "ko" },
    });
    expect(panel.plainLanguageStatus).toContain("mission");
    expect(panel.plainLanguageStatus).toContain("결정");
  });

  test("English output for not-ready verdict", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "not-ready" }),
      hints: { preferredLanguage: "en" },
    });
    expect(panel.plainLanguageStatus).toContain("decision");
    expect(panel.plainLanguageStatus).not.toContain("결정");
  });

  test("Korean output for ready-for-semantic-approval", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: false }),
      hints: { preferredLanguage: "ko", hasApprovedSemanticIntentContract: true },
    });
    expect(panel.plainLanguageStatus).toContain("SIC");
    expect(panel.plainLanguageStatus).toContain("승인");
    expect(panel.plainLanguageStatus).toContain("DTC");
    expect(panel.plainLanguageStatus).toContain("검증 계획");
    expect(panel.plainLanguageStatus).toContain("구현은 시작되지 않습니다");
  });

  test("English output for ready-for-semantic-approval", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "ready-for-semantic-approval", readOnly: false }),
      hints: { preferredLanguage: "en", hasApprovedSemanticIntentContract: true },
    });
    expect(panel.plainLanguageStatus).toContain("SIC");
    expect(panel.plainLanguageStatus).toContain("DTC");
    expect(panel.plainLanguageStatus).toContain("validation plan");
    expect(panel.plainLanguageStatus).toContain("does not start implementation");
  });

  test("no language hint → defaults to English", () => {
    const panel = buildFDEPanel({
      session: session({ readiness: "not-ready" }),
    });
    // English fallback: should contain "decision" not "결정"
    expect(panel.plainLanguageStatus).toContain("decision");
  });

  test("all 9 readiness verdicts have a non-empty string in English", () => {
    const verdicts = [
      "not-ready",
      "mission-clear",
      "object-link-clear",
      "action-clear",
      "chatbot-clear",
      "eval-clear",
      "ready-for-semantic-approval",
    ] as const;

    for (const readiness of verdicts) {
      const panel = buildFDEPanel({
        session: session({ readiness }),
        hints: { preferredLanguage: "en" },
      });
      expect(panel.plainLanguageStatus.length).toBeGreaterThan(0);
    }
  });

  test("all 9 readiness verdicts have a non-empty string in Korean", () => {
    const verdicts = [
      "not-ready",
      "mission-clear",
      "object-link-clear",
      "action-clear",
      "chatbot-clear",
      "eval-clear",
      "ready-for-semantic-approval",
    ] as const;

    for (const readiness of verdicts) {
      const panel = buildFDEPanel({
        session: session({ readiness }),
        hints: { preferredLanguage: "ko" },
      });
      expect(panel.plainLanguageStatus.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// nextQuestion
// ---------------------------------------------------------------------------

describe("buildFDEPanel — nextQuestion", () => {
  test("no nextQuestion on session and no topGaps → nextQuestion absent", () => {
    const panel = buildFDEPanel({ session: session() });
    expect("nextQuestion" in panel).toBe(false);
  });

  test("session.nextQuestion is preferred", () => {
    const panel = buildFDEPanel({
      session: session({
        nextQuestion: "What is the primary decision this chatbot supports?",
        topGaps: [
          {
            gapId: "g1",
            level: "mission-decision",
            severity: "high",
            description: "No mission",
            nextQuestion: "Fallback question",
          },
        ],
      }),
    });
    expect(panel.nextQuestion).toBe("What is the primary decision this chatbot supports?");
  });

  test("topGaps[0].nextQuestion used when session.nextQuestion absent", () => {
    const panel = buildFDEPanel({
      session: session({
        topGaps: [
          {
            gapId: "g1",
            level: "mission-decision",
            severity: "high",
            description: "No mission",
            nextQuestion: "What decision does this chatbot help with?",
          },
        ],
      }),
    });
    expect(panel.nextQuestion).toBe("What decision does this chatbot help with?");
  });

  test("topGaps[0] without nextQuestion → nextQuestion absent", () => {
    const panel = buildFDEPanel({
      session: session({
        topGaps: [
          {
            gapId: "g1",
            level: "mission-decision",
            severity: "high",
            description: "No mission",
          },
        ],
      }),
    });
    expect("nextQuestion" in panel).toBe(false);
  });
});
