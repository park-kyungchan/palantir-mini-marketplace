// palantir-mini sprint-138 Slice 1.B — session-composer tests
import { describe, test, expect } from "bun:test";
import { composeFDEOntologyBuildSession } from "../../../lib/fde-build/session-composer";
import type { ComposeFDEOntologyBuildSessionInput } from "../../../lib/fde-build/session-composer";

// =============================================================================
// Fixtures
// =============================================================================

const EMPTY_INPUT: ComposeFDEOntologyBuildSessionInput = {
  project: "/home/palantirkc/projects/test-project",
  nowIso: "2026-05-14T10:00:00.000Z",
};

const MISSION_ONLY_INPUT: ComposeFDEOntologyBuildSessionInput = {
  project: "/home/palantirkc/projects/test-project",
  ontologyContext: {
    missionContext: {
      useCaseName: "Supply Chain Decision Support",
      operationalDecision: "Which supplier to approve for emergency orders",
    },
  },
  nowIso: "2026-05-14T10:00:00.000Z",
};

const FULL_APPROVED_SIC_INPUT: ComposeFDEOntologyBuildSessionInput = {
  project: "/home/palantirkc/projects/test-project",
  ontologyContext: {
    missionContext: {
      useCaseName: "Inventory Management",
      operationalDecision: "Reorder decision for low-stock items",
    },
    objectTypes: [
      {
        objectTypeName: "InventoryItem",
        primaryKeyStrategy: "natural-key",
        isRealWorldEntityOrEvent: "entity",
      },
    ],
    linkTypes: [
      {
        linkTypeName: "hasSupplier",
        sourceObjectType: "InventoryItem",
        targetObjectType: "Supplier",
        businessMeaning: "The supplier who provides this inventory item",
        cardinality: "many-to-many",
      },
    ],
    actionTypes: [
      {
        actionTypeName: "reorderStock",
        operationalIntent: "Trigger a reorder request for a low-stock item",
      },
    ],
    chatbots: [
      {
        chatbotName: "InventoryAssistant",
        evalSuite: "inventory-eval-suite-v1",
        citationPolicy: "required",
      },
    ],
    evalObservability: {
      evalSuiteName: "inventory-eval-suite-v1",
      latestPassRate: 0.92,
    },
  },
  semanticIntentContract: {
    semanticIntentContractRef: "sic-ref-12345",
  },
  nowIso: "2026-05-14T10:00:00.000Z",
};

// =============================================================================
// Tests — empty input
// =============================================================================

describe("composeFDEOntologyBuildSession — empty input", () => {
  test("returns readiness not-ready when all inputs absent", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.readiness).toBe("not-ready");
  });

  test("mutationAuthorized is always false (literal type invariant)", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.mutationAuthorized).toBe(false);
  });

  test("requiresDigitalTwinChangeContract is false when no SIC", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.requiresDigitalTwinChangeContract).toBe(false);
  });

  test("readOnly is true when not ready-for-semantic-approval", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.readOnly).toBe(true);
  });

  test("topGaps[0].level is mission-decision when no mission context", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.topGaps.length).toBeGreaterThan(0);
    expect(session.topGaps[0]!.level).toBe("mission-decision");
  });

  test("nextQuestion is set when not ready", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(typeof session.nextQuestion).toBe("string");
    expect(session.nextQuestion!.length).toBeGreaterThan(0);
  });

  test("schemaVersion matches expected constant", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.schemaVersion).toBe("palantir-mini/fde-ontology-build-session/v1");
  });

  test("composedAt matches input nowIso", () => {
    const session = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session.composedAt).toBe("2026-05-14T10:00:00.000Z");
  });

  test("sessionRid is deterministic from project + composedAt", () => {
    const session1 = composeFDEOntologyBuildSession(EMPTY_INPUT);
    const session2 = composeFDEOntologyBuildSession(EMPTY_INPUT);
    expect(session1.sessionRid).toBe(session2.sessionRid);
    expect(session1.sessionRid).toContain("fde-session:");
    expect(session1.sessionRid).toContain("test-project");
  });
});

// =============================================================================
// Tests — mission-only input
// =============================================================================

describe("composeFDEOntologyBuildSession — mission-only input", () => {
  test("returns mission-clear when only mission context provided", () => {
    const session = composeFDEOntologyBuildSession(MISSION_ONLY_INPUT);
    expect(session.readiness).toBe("mission-clear");
  });

  test("completedLevels includes mission-decision", () => {
    const session = composeFDEOntologyBuildSession(MISSION_ONLY_INPUT);
    expect(session.completedLevels).toContain("mission-decision");
  });

  test("missionDecision.useCaseName is populated", () => {
    const session = composeFDEOntologyBuildSession(MISSION_ONLY_INPUT);
    expect(session.missionDecision?.useCaseName).toBe("Supply Chain Decision Support");
  });

  test("objectTypes is empty array (none provided)", () => {
    const session = composeFDEOntologyBuildSession(MISSION_ONLY_INPUT);
    expect(session.objectTypes).toEqual([]);
  });

  test("mutationAuthorized remains false in mission-clear state", () => {
    const session = composeFDEOntologyBuildSession(MISSION_ONLY_INPUT);
    expect(session.mutationAuthorized).toBe(false);
  });
});

// =============================================================================
// Tests — full input with approved SIC
// =============================================================================

describe("composeFDEOntologyBuildSession — full input with approved SIC", () => {
  test("returns ready-for-semantic-approval with approved SIC + full data", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    expect(session.readiness).toBe("ready-for-semantic-approval");
  });

  test("requiresDigitalTwinChangeContract is true when ready + SIC approved", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    expect(session.requiresDigitalTwinChangeContract).toBe(true);
  });

  test("mutationAuthorized is STILL false even when ready-for-semantic-approval", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    // This is the critical invariant: mutationAuthorized is ALWAYS false.
    expect(session.mutationAuthorized).toBe(false);
  });

  test("semanticIntentContractRef is populated from SIC input", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    expect(session.semanticIntentContractRef).toBe("sic-ref-12345");
  });

  test("completedLevels includes all 5 required levels", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    expect(session.completedLevels).toContain("mission-decision");
    expect(session.completedLevels).toContain("object-type");
    expect(session.completedLevels).toContain("link-type");
    expect(session.completedLevels).toContain("action-writeback");
    expect(session.completedLevels).toContain("chatbot-studio");
    expect(session.completedLevels).toContain("eval-observability");
  });

  test("topGaps length is at most 5", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    expect(session.topGaps.length).toBeLessThanOrEqual(5);
  });

  test("plainLanguageStatus is non-empty string", () => {
    const session = composeFDEOntologyBuildSession(FULL_APPROVED_SIC_INPUT);
    expect(typeof session.plainLanguageStatus).toBe("string");
    expect(session.plainLanguageStatus.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Tests — determinism
// =============================================================================

describe("composeFDEOntologyBuildSession — determinism with nowIso", () => {
  test("same input + nowIso produces same sessionRid", () => {
    const a = composeFDEOntologyBuildSession({ project: "/tmp/proj", nowIso: "2026-01-01T00:00:00.000Z" });
    const b = composeFDEOntologyBuildSession({ project: "/tmp/proj", nowIso: "2026-01-01T00:00:00.000Z" });
    expect(a.sessionRid).toBe(b.sessionRid);
  });

  test("different nowIso produces different sessionRid", () => {
    const a = composeFDEOntologyBuildSession({ project: "/tmp/proj", nowIso: "2026-01-01T00:00:00.000Z" });
    const b = composeFDEOntologyBuildSession({ project: "/tmp/proj", nowIso: "2026-01-02T00:00:00.000Z" });
    expect(a.sessionRid).not.toBe(b.sessionRid);
  });
});
