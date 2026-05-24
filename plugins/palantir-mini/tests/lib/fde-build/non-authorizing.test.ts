// palantir-mini sprint-138 Slice 1.B — non-authorizing shape tests
// Verifies that FDEOntologyBuildSession never carries mutation-authorization
// fields (commitToken, applyToken, approvalToken, authorizeMutation) and that
// the read-only invariants from the schema primitive are upheld at runtime.
import { describe, test, expect } from "bun:test";
import { composeFDEOntologyBuildSession } from "../../../lib/fde-build/session-composer";
import type { FDEOntologyBuildSession } from "../../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";

// =============================================================================
// Shared fixture
// =============================================================================

function makeSampleSession(): FDEOntologyBuildSession {
  return composeFDEOntologyBuildSession({
    project: "/tmp/x",
    nowIso: "2026-05-14T10:00:00.000Z",
  });
}

function makeFullReadySession(): FDEOntologyBuildSession {
  return composeFDEOntologyBuildSession({
    project: "/tmp/x",
    ontologyContext: {
      missionContext: {
        useCaseName: "Test Use Case",
        operationalDecision: "Approve or reject vendor proposals",
      },
      objectTypes: [
        {
          objectTypeName: "Vendor",
          primaryKeyStrategy: "natural-key",
        },
      ],
      linkTypes: [
        {
          linkTypeName: "hasProposal",
          sourceObjectType: "Vendor",
          targetObjectType: "Proposal",
          businessMeaning: "Each vendor can submit one or more proposals",
        },
      ],
      actionTypes: [
        {
          actionTypeName: "approveVendor",
          operationalIntent: "Record the decision to approve a vendor for the next cycle",
        },
      ],
      chatbots: [
        {
          chatbotName: "VendorAssistant",
          evalSuite: "vendor-eval-v1",
        },
      ],
      evalObservability: {
        evalSuiteName: "vendor-eval-v1",
        latestPassRate: 0.95,
      },
    },
    semanticIntentContract: {
      semanticIntentContractRef: "sic-ref-test-001",
    },
    nowIso: "2026-05-14T10:00:00.000Z",
  });
}

// =============================================================================
// Tests — forbidden fields must be absent
// =============================================================================

describe("non-authorizing shape — no mutation fields present", () => {
  test("commitToken is absent from session (any state)", () => {
    const sample = makeSampleSession();
    expect((sample as unknown as Record<string, unknown>)["commitToken"]).toBeUndefined();
  });

  test("applyToken is absent from session (any state)", () => {
    const sample = makeSampleSession();
    expect((sample as unknown as Record<string, unknown>)["applyToken"]).toBeUndefined();
  });

  test("approvalToken is absent from session (any state)", () => {
    const sample = makeSampleSession();
    expect((sample as unknown as Record<string, unknown>)["approvalToken"]).toBeUndefined();
  });

  test("authorizeMutation is absent from session (any state)", () => {
    const sample = makeSampleSession();
    expect((sample as unknown as Record<string, unknown>)["authorizeMutation"]).toBeUndefined();
  });

  test("commitToken is absent even when ready-for-semantic-approval", () => {
    const fullSession = makeFullReadySession();
    expect(fullSession.readiness).toBe("ready-for-semantic-approval");
    // Even at the top of the read-only ladder, no commit token.
    expect((fullSession as unknown as Record<string, unknown>)["commitToken"]).toBeUndefined();
  });

  test("applyToken is absent even when ready-for-semantic-approval", () => {
    const fullSession = makeFullReadySession();
    expect((fullSession as unknown as Record<string, unknown>)["applyToken"]).toBeUndefined();
  });

  test("approvalToken is absent even when ready-for-semantic-approval", () => {
    const fullSession = makeFullReadySession();
    expect((fullSession as unknown as Record<string, unknown>)["approvalToken"]).toBeUndefined();
  });

  test("authorizeMutation is absent even when ready-for-semantic-approval", () => {
    const fullSession = makeFullReadySession();
    expect((fullSession as unknown as Record<string, unknown>)["authorizeMutation"]).toBeUndefined();
  });
});

// =============================================================================
// Tests — mutationAuthorized literal type
// =============================================================================

describe("non-authorizing shape — mutationAuthorized literal false", () => {
  test("mutationAuthorized is exactly false (not 0, not null, not undefined)", () => {
    const sample = makeSampleSession();
    // Strict equality — not just falsy.
    expect(sample.mutationAuthorized).toBe(false);
    expect(sample.mutationAuthorized === false).toBe(true);
  });

  test("mutationAuthorized is false at not-ready", () => {
    const session = composeFDEOntologyBuildSession({ project: "/tmp/test", nowIso: "2026-05-14T00:00:00.000Z" });
    expect(session.readiness).toBe("not-ready");
    expect(session.mutationAuthorized).toBe(false);
  });

  test("mutationAuthorized is false at ready-for-semantic-approval", () => {
    const fullSession = makeFullReadySession();
    expect(fullSession.readiness).toBe("ready-for-semantic-approval");
    // HARD INVARIANT: STILL false at the top of the read-only ladder.
    expect(fullSession.mutationAuthorized).toBe(false);
  });
});

// =============================================================================
// Tests — FDEGapReport recommendationOnly invariant
// FDEGapReport.recommendationOnly is a literal true type.
// We verify this by checking that gaps surfaced in the session never include
// a finalRecommendation of "ready-for-production" (not a valid enum value).
// =============================================================================

describe("non-authorizing shape — gap report invariants", () => {
  test("allGaps entries never contain finalRecommendation = ready-for-production", () => {
    const session = makeFullReadySession();
    for (const gap of session.allGaps) {
      // FDEReviewLevelGap does not have finalRecommendation — verify it's absent.
      expect((gap as unknown as Record<string, unknown>)["finalRecommendation"]).toBeUndefined();
    }
  });

  test("allGaps entries have required fields (gapId, level, severity, description)", () => {
    const sessionWithGaps = composeFDEOntologyBuildSession({
      project: "/tmp/test-gaps",
      ontologyContext: {
        // Provide objectTypes without primaryKeyStrategy to trigger a gap.
        objectTypes: [{ objectTypeName: "MissingKeyObj" }],
        // Also provide missionContext and links to push readiness forward.
        missionContext: { useCaseName: "Gap Test", operationalDecision: "Find gaps" },
        linkTypes: [{ linkTypeName: "aLink", sourceObjectType: "A", targetObjectType: "B", businessMeaning: "test" }],
      },
      nowIso: "2026-05-14T10:00:00.000Z",
    });

    for (const gap of sessionWithGaps.allGaps) {
      expect(typeof gap.gapId).toBe("string");
      expect(gap.gapId.length).toBeGreaterThan(0);
      expect(typeof gap.level).toBe("string");
      expect(["blocking", "high", "medium", "low"]).toContain(gap.severity);
      expect(typeof gap.description).toBe("string");
    }
  });

  test("topGaps is a subset of allGaps (by gapId)", () => {
    const session = makeSampleSession();
    const allGapIds = new Set(session.allGaps.map((g) => g.gapId));
    for (const topGap of session.topGaps) {
      expect(allGapIds.has(topGap.gapId)).toBe(true);
    }
  });

  test("topGaps respects ≤ 5 constraint", () => {
    const session = makeSampleSession();
    expect(session.topGaps.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Tests — schemaVersion integrity
// =============================================================================

describe("non-authorizing shape — schema version integrity", () => {
  test("schemaVersion is the expected constant string", () => {
    const session = makeSampleSession();
    expect(session.schemaVersion).toBe("palantir-mini/fde-ontology-build-session/v1");
  });

  test("schemaVersion is identical across multiple compositions", () => {
    const a = makeSampleSession();
    const b = makeFullReadySession();
    expect(a.schemaVersion).toBe(b.schemaVersion);
  });
});
