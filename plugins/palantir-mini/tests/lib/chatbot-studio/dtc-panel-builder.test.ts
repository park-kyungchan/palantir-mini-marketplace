import { describe, expect, test } from "bun:test";
import {
  buildDtcPanel,
  DTC_PANEL_SCHEMA_VERSION,
  type DtcPanelStatus,
} from "../../../lib/chatbot-studio/dtc-panel-builder";
import type { DtcFillSequenceSession } from "../../../lib/chatbot-studio/dtc-fill-session";
import { DTC_FILL_SEQUENCE_SESSION_SCHEMA_VERSION } from "../../../lib/chatbot-studio/dtc-fill-session";
import type { DigitalTwinRequiredUserDecision } from "../../../lib/lead-intent/contracts";
import { DTC_FILL_SEQUENCE } from "../../../lib/semantic-intent/fill-sequence";
import type { DtcWithFillFields } from "../../../lib/semantic-intent/dtc-fill-sequence";

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

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

function session(overrides: Partial<DtcFillSequenceSession> = {}): DtcFillSequenceSession {
  return {
    schemaVersion: DTC_FILL_SEQUENCE_SESSION_SCHEMA_VERSION,
    sessionId: "sess-test-001",
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
// HARD INVARIANT: mutationAuthorizedFromPanel is always false
// ---------------------------------------------------------------------------

describe("buildDtcPanel — HARD INVARIANT: mutationAuthorizedFromPanel", () => {
  test("is always literal false for not-started session", () => {
    const panel = buildDtcPanel({ session: session() });
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });

  test("is always literal false for in-progress session", () => {
    const panel = buildDtcPanel({
      session: session({ completedTurns: [0, 1, 2], currentTurnIndex: 3 }),
    });
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });

  test("is always literal false for dtc-filled session", () => {
    const panel = buildDtcPanel({
      session: session({
        completedTurns: [0, 1, 2, 3, 4, 5, 6],
        fillVerdict: "dtc-filled",
        currentTurnIndex: -1,
      }),
    });
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });

  test("is always literal false for dtc-approved session", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0, 1, 2, 3, 4, 5, 6] }),
    });
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });

  test("strict equality check (not just falsy)", () => {
    const panel = buildDtcPanel({ session: session() });
    // Must be exact boolean false, not null/undefined/0
    expect(panel.mutationAuthorizedFromPanel === false).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

describe("buildDtcPanel — schema", () => {
  test("output carries correct schemaVersion", () => {
    const panel = buildDtcPanel({ session: session() });
    expect(panel.schemaVersion).toBe(DTC_PANEL_SCHEMA_VERSION);
  });

  test("composedAt uses provided nowIso", () => {
    const panel = buildDtcPanel({
      session: session(),
      nowIso: "2026-01-01T12:00:00.000Z",
    });
    expect(panel.composedAt).toBe("2026-01-01T12:00:00.000Z");
  });

  test("composedAt falls back to real timestamp when nowIso absent", () => {
    const before = new Date().toISOString();
    const panel = buildDtcPanel({ session: session() });
    const after = new Date().toISOString();
    expect(panel.composedAt >= before).toBe(true);
    expect(panel.composedAt <= after).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deriveStatus
// ---------------------------------------------------------------------------

describe("buildDtcPanel — deriveStatus", () => {
  test("empty completedTurns + verdict=draft → status='not-started'", () => {
    const panel = buildDtcPanel({
      session: session({ completedTurns: [], fillVerdict: "draft" }),
    });
    expect(panel.status).toBe("not-started");
  });

  test("3 completedTurns + verdict=draft → status='in-progress'", () => {
    const panel = buildDtcPanel({
      session: session({ completedTurns: [0, 1, 2], fillVerdict: "draft" }),
    });
    expect(panel.status).toBe("in-progress");
  });

  test("verdict=dtc-filled → status='dtc-filled'", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-filled", completedTurns: [0, 1, 2, 3, 4, 5, 6] }),
    });
    expect(panel.status).toBe("dtc-filled");
  });

  test("verdict=dtc-approved → status='dtc-approved'", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0, 1, 2, 3, 4, 5, 6] }),
    });
    expect(panel.status).toBe("dtc-approved");
  });

  test("verdict=dtc-approved overrides non-empty completedTurns", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0] }),
    });
    expect(panel.status).toBe("dtc-approved");
  });

  test("verdict=dtc-filled overrides empty completedTurns", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-filled", completedTurns: [] }),
    });
    expect(panel.status).toBe("dtc-filled");
  });
});

// ---------------------------------------------------------------------------
// Bilingual plainLanguageStatus
// ---------------------------------------------------------------------------

describe("buildDtcPanel — bilingual plainLanguageStatus", () => {
  const statuses: DtcPanelStatus[] = ["not-started", "in-progress", "dtc-filled", "dtc-approved"];

  for (const status of statuses) {
    const sess =
      status === "dtc-approved"
        ? session({ fillVerdict: "dtc-approved", completedTurns: [0] })
        : status === "dtc-filled"
          ? session({ fillVerdict: "dtc-filled", completedTurns: [0] })
          : status === "in-progress"
            ? session({ completedTurns: [0], fillVerdict: "draft" })
            : session({ completedTurns: [], fillVerdict: "draft" });

    test(`preferredLanguage="ko" → Korean text for status='${status}'`, () => {
      const panel = buildDtcPanel({ session: sess, hints: { preferredLanguage: "ko" } });
      expect(panel.plainLanguageStatus.length).toBeGreaterThan(0);
      // Korean strings should contain Korean characters (가-힣 range)
      expect(/[가-힯]/.test(panel.plainLanguageStatus)).toBe(true);
    });

    test(`preferredLanguage="en" → English text for status='${status}'`, () => {
      const panel = buildDtcPanel({ session: sess, hints: { preferredLanguage: "en" } });
      expect(panel.plainLanguageStatus.length).toBeGreaterThan(0);
      // English strings should NOT contain Korean characters
      expect(/[가-힯]/.test(panel.plainLanguageStatus)).toBe(false);
    });
  }

  test("undefined preferredLanguage → defaults to Korean (STATUS_KO)", () => {
    // no hints at all → Korean default
    const panel = buildDtcPanel({ session: session({ completedTurns: [], fillVerdict: "draft" }) });
    // STATUS_KO["not-started"] contains Korean characters
    expect(/[가-힯]/.test(panel.plainLanguageStatus)).toBe(true);
  });

  test("dtc-approved Korean status routes before execution and names work-contract validation", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0, 1, 2, 3, 4, 5, 6] }),
      hints: { preferredLanguage: "ko" },
    });

    expect(panel.plainLanguageStatus).toContain("라우터");
    expect(panel.plainLanguageStatus).toContain("WorkContract");
    expect(panel.plainLanguageStatus).toContain("검증");
    expect(panel.plainLanguageStatus).not.toContain("구현을 시작할 수");
  });

  test("dtc-approved English status routes before execution and names validation", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0, 1, 2, 3, 4, 5, 6] }),
      hints: { preferredLanguage: "en" },
    });

    expect(panel.plainLanguageStatus).toContain("router");
    expect(panel.plainLanguageStatus).toContain("WorkContract");
    expect(panel.plainLanguageStatus).toContain("validation");
    expect(panel.plainLanguageStatus).not.toContain("Implementation may proceed");
  });
});

// ---------------------------------------------------------------------------
// Progress fraction
// ---------------------------------------------------------------------------

describe("buildDtcPanel — progress fraction", () => {
  test("0 completed turns → progress = 0", () => {
    const panel = buildDtcPanel({ session: session({ completedTurns: [] }) });
    expect(panel.progress).toBe(0);
  });

  test("progress = completedTurns.length / DTC_FILL_SEQUENCE.length", () => {
    const completed = [0, 1, 2];
    const panel = buildDtcPanel({ session: session({ completedTurns: completed }) });
    expect(panel.progress).toBe(completed.length / DTC_FILL_SEQUENCE.length);
  });

  test("all 7 turns completed → progress = 1", () => {
    const panel = buildDtcPanel({
      session: session({ completedTurns: [0, 1, 2, 3, 4, 5, 6], fillVerdict: "dtc-filled" }),
    });
    expect(panel.progress).toBe(1);
  });

  test("DTC_FILL_SEQUENCE.length === 7", () => {
    expect(DTC_FILL_SEQUENCE.length).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// turnIndex + descriptor passthrough
// ---------------------------------------------------------------------------

describe("buildDtcPanel — turnIndex and descriptor", () => {
  test("currentTurnIndex < 0 → projection.turnIndex < 0", () => {
    const panel = buildDtcPanel({ session: session({ currentTurnIndex: -1 }) });
    expect(panel.turnIndex).toBe(-1);
  });

  test("currentTurnIndex = -1 → no question field", () => {
    const panel = buildDtcPanel({ session: session({ currentTurnIndex: -1 }) });
    expect("question" in panel).toBe(false);
    expect("questionEn" in panel).toBe(false);
  });

  test("turnIndex within range → question and questionEn surface from DTC_FILL_SEQUENCE", () => {
    const panel = buildDtcPanel({ session: session({ currentTurnIndex: 0 }) });
    expect(panel.turnIndex).toBe(0);
    expect(panel.question).toBe(DTC_FILL_SEQUENCE[0]!.question);
    expect(panel.questionEn).toBe(DTC_FILL_SEQUENCE[0]!.questionEn);
  });

  test("turnIndex = 3 → surfaces T3 descriptor", () => {
    const panel = buildDtcPanel({ session: session({ currentTurnIndex: 3 }) });
    expect(panel.turnIndex).toBe(3);
    expect(panel.question).toBe(DTC_FILL_SEQUENCE[3]!.question);
    expect(panel.questionEn).toBe(DTC_FILL_SEQUENCE[3]!.questionEn);
  });

  test("turnIndex out of range (>= length) → no question fields", () => {
    const panel = buildDtcPanel({
      session: session({ currentTurnIndex: DTC_FILL_SEQUENCE.length }),
    });
    expect("question" in panel).toBe(false);
    expect("questionEn" in panel).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// nextAllowedAction
// ---------------------------------------------------------------------------

describe("buildDtcPanel — nextAllowedAction", () => {
  test("dtc-approved → ['route-with-approved-dtc']", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0] }),
    });
    expect(panel.nextAllowedAction).toEqual(["route-with-approved-dtc"]);
  });

  test("dtc-approved copy allows routing but not direct mutation", () => {
    const ko = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0] }),
      hints: { preferredLanguage: "ko" },
    });
    expect(ko.plainLanguageStatus).toContain("라우터");
    expect(ko.plainLanguageStatus).toContain("WorkContract");
    expect(ko.plainLanguageStatus).toContain("검증");
    expect(ko.plainLanguageStatus).not.toContain("구현을 시작");

    const en = buildDtcPanel({
      session: session({ fillVerdict: "dtc-approved", completedTurns: [0] }),
      hints: { preferredLanguage: "en" },
    });
    expect(en.plainLanguageStatus).toContain("router");
    expect(en.plainLanguageStatus).toContain("WorkContract");
    expect(en.plainLanguageStatus).toContain("validation");
    expect(en.plainLanguageStatus).not.toContain("Implementation may proceed");
  });

  test("dtc-filled → ['request-dtc-approval', 'revise-dtc-turn']", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-filled", completedTurns: [0] }),
    });
    expect(panel.nextAllowedAction).toEqual(["request-dtc-approval", "revise-dtc-turn"]);
  });

  test("not-started → includes answer-dtc-turn + dtc-auto-fill-remaining + hold-dtc-fill", () => {
    const panel = buildDtcPanel({ session: session() });
    expect(panel.nextAllowedAction).toContain("answer-dtc-turn");
    expect(panel.nextAllowedAction).toContain("revise-dtc-turn");
    expect(panel.nextAllowedAction).toContain("dtc-auto-fill-remaining");
    expect(panel.nextAllowedAction).toContain("hold-dtc-fill");
  });

  test("in-progress → same action set as not-started", () => {
    const panel = buildDtcPanel({
      session: session({ completedTurns: [0, 1], fillVerdict: "draft" }),
    });
    expect(panel.nextAllowedAction).toContain("answer-dtc-turn");
    expect(panel.nextAllowedAction).toContain("dtc-auto-fill-remaining");
  });
});

// ---------------------------------------------------------------------------
// blockingUnresolvedTerms passthrough
// ---------------------------------------------------------------------------

describe("buildDtcPanel — blockingUnresolvedTerms", () => {
  test("absent in session → empty array in projection", () => {
    const panel = buildDtcPanel({ session: session({ blockingUnresolvedTerms: undefined }) });
    expect(panel.blockingUnresolvedTerms).toEqual([]);
  });

  test("terms present → passed through unchanged", () => {
    const terms = ["TermA", "TermB"];
    const panel = buildDtcPanel({
      session: session({ blockingUnresolvedTerms: terms }),
    });
    expect(panel.blockingUnresolvedTerms).toEqual(["TermA", "TermB"]);
  });

  test("empty array → empty array", () => {
    const panel = buildDtcPanel({ session: session({ blockingUnresolvedTerms: [] }) });
    expect(panel.blockingUnresolvedTerms).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// DATA/LOGIC/ACTION/TECHNOLOGY/GOVERNANCE decision closure
// ---------------------------------------------------------------------------

describe("buildDtcPanel — decisionClosure", () => {
  const requiredUserDecisions: DigitalTwinRequiredUserDecision[] = [
    {
      decisionId: "decision:data",
      domain: "DATA",
      label: "Approve DATA boundary",
      status: "approved",
      blocking: true,
      evidenceRefs: ["context-plan:data"],
      approvalRef: "user:approved:data",
    },
    {
      decisionId: "decision:logic",
      domain: "LOGIC",
      label: "Approve LOGIC boundary",
      status: "approved",
      blocking: true,
      evidenceRefs: ["context-plan:logic"],
      approvalRef: "user:approved:logic",
    },
    {
      decisionId: "decision:action",
      domain: "ACTION",
      label: "Approve ACTION/writeback boundary",
      status: "open",
      blocking: true,
      evidenceRefs: ["context-plan:action"],
    },
    {
      decisionId: "decision:technology",
      domain: "TECHNOLOGY",
      label: "Accept TECHNOLOGY mirror-only risk",
      status: "accepted-risk",
      blocking: true,
      evidenceRefs: ["context-plan:technology"],
      acceptedRiskRef: "user:accepted-risk:technology",
    },
    {
      decisionId: "decision:governance",
      domain: "GOVERNANCE",
      label: "Approve GOVERNANCE and validation boundary",
      status: "approved",
      blocking: true,
      evidenceRefs: ["context-plan:governance"],
      approvalRef: "user:approved:governance",
    },
  ];

  test("surfaces five review domains without authorizing mutation", () => {
    const panel = buildDtcPanel({
      session: session({ fillVerdict: "dtc-filled", completedTurns: [0, 1, 2, 3, 4, 5, 6] }),
      hints: { requiredUserDecisions },
    });

    expect(panel.decisionClosure.map((decision) => decision.domain)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(panel.decisionClosure.map((decision) => decision.status)).toEqual([
      "approved",
      "approved",
      "open",
      "accepted-risk",
      "approved",
    ]);
    expect(
      panel.decisionClosure.every((decision) => decision.mutationAuthorizedFromDecision === false),
    ).toBe(true);
    expect(panel.mutationAuthorizedFromPanel).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// completedTurns passthrough
// ---------------------------------------------------------------------------

describe("buildDtcPanel — completedTurns", () => {
  test("completedTurns are copied from session", () => {
    const turns = [0, 1, 2];
    const s = session({ completedTurns: turns });
    const panel = buildDtcPanel({ session: s });
    expect(panel.completedTurns).toEqual([0, 1, 2]);
  });

  test("completedTurns in projection is a different reference from session", () => {
    const s = session({ completedTurns: [0, 1] });
    const panel = buildDtcPanel({ session: s });
    expect(panel.completedTurns).not.toBe(s.completedTurns);
  });
});
