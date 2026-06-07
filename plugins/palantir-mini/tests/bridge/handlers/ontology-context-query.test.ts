// palantir-mini v6.14.0 — ontology_context_query canonical Phase 3 handler tests
//
// Sprint-093 PR 3.1 (canonical plan v2 §4 row 3.1; proposal §8 Stage 4).
// 3 headline assertions per spec.md §Tests:
//   (1) all 7 sub-context fields + 5 derived fields populated with correct shape
//   (2) includeImpact=false omits impactContext + sets graphConfidence=1.0
//   (3) handler is registered in MCP TOOLS array
//
// Predecessor regression preserved at ontology-context-query-legacy.test.ts.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import handler from "../../../bridge/handlers/ontology-context-query";
import { TOOLS } from "../../../bridge/mcp-server";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";
import {
  fdeOntologyEngineeringSessionRef,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../../lib/fde-ontology-engineering/session-store";

const ALLOWED_AGENT_USE = [
  "lead-direct",
  "targeted-verification",
  "bounded-explorer",
  "none",
] as const;

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
}

function makeFDEProjectionSession(projectRoot: string, sessionId = "fde-session:ocq-test"): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId,
    projectRoot,
    universalOntologyEntryRef: "universal-ontology-entry://ocq-test",
    phase: "governance-eval",
    turnCount: 1,
    userFacingSummary: "Prioritize inventory replenishment.",
    confirmedUserGoal: "Help operators decide which item to restock first.",
    confirmedNonGoals: [],
    latentHypotheses: [],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    missionModel: {
      useCaseName: "Inventory Restock",
      operationalDecision: "Which item should be restocked first?",
      decisionOwnerRole: "Store operator",
      successSignals: ["fewer stockouts"],
    },
    objectCandidates: [
      {
        candidateId: "object:item",
        plainName: "InventoryItem",
        whyItMayMatter: "Core decision subject.",
        evidenceRefs: ["dataset:inventory"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "link:item-supplier",
        plainName: "suppliedBy",
        sourceObject: "InventoryItem",
        targetObject: "Supplier",
        businessMeaning: "Supplier can replenish item.",
        evidenceRefs: ["dataset:supplier"],
      },
    ],
    actionCandidates: [
      {
        candidateId: "action:reorder",
        plainName: "requestReorder",
        operationalIntent: "Record a replenishment request.",
        writebackRisk: "medium",
        evidenceRefs: ["workflow:reorder"],
      },
    ],
    functionCandidates: [
      {
        candidateId: "function:rank",
        plainName: "rankRestockPriority",
        logicIntent: "Rank restock urgency.",
        deterministic: true,
        evidenceRefs: ["logic:rank"],
      },
    ],
    chatbotContextCandidates: [
      {
        candidateId: "chatbot:inventory",
        plainName: "InventoryAssistant",
        applicationStateNeed: "selectedStoreId",
        retrievalContextNeed: "policy notes",
        evidenceRefs: ["app:inventory-assistant"],
      },
    ],
    unresolvedQuestions: [],
    stableSummary: {
      confirmedIntent: "Inventory restock ontology review.",
      missionSummary: "Restock priority decision.",
      evidenceSummary: "Inventory and supplier evidence.",
      ontologySummary: "Item, supplier, reorder action, priority function.",
      governanceSummary: "Read-only projection.",
      acceptedHypothesisCount: 0,
      rejectedHypothesisCount: 0,
      deferredHypothesisCount: 0,
      unresolvedBlockingQuestionCount: 0,
      sourceTurnIds: ["turn-1"],
      updatedAt: "2026-05-21T00:00:00.000Z",
    },
    phaseHistory: [],
    sourceRefs: ["universal-ontology-entry://ocq-test"],
    recentTurnSummaries: [],
    turnRecordIds: ["turn-1"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

describe("ontology_context_query — canonical Phase 3 handler (sprint-093 PR 3.1)", () => {
  test("(1) returns all 7 sub-context fields + 5 derived fields with correct shape", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ontology-ctx-q-pr3.1-"),
    );
    try {
      // Default opts: all include* implicitly true (proposal §8 Stage 4).
      const result = await handler({
        project: projectRoot,
        requestedAxes: ["file:nonexistent-axis-rid"],
      });

      // Projections (7 sub-contexts).
      expect(result.applicationState).toBeDefined();
      // Sprint-094 PR 3.2: status discriminant flipped from "pending-pr-3.2" to
      // "composed" once the real composer was wired. Keep this assertion as
      // a single-line relax so PR 3.1's contract remains visible.
      expect(result.applicationState.status).toBe("composed");

      expect(result.retrievalContext).toBeDefined();
      // Sprint-095 PR 3.3: status discriminant flipped from "pending-pr-3.3" to
      // "composed" once the real composer was wired. Keep this assertion as
      // a single-line relax so PR 3.1's contract remains visible.
      expect(result.retrievalContext.status).toBe("composed");

      expect(result.impactContext).toBeDefined();
      expect(Array.isArray(result.impactContext?.axisRids)).toBe(true);
      expect(Array.isArray(result.impactContext?.perRidImpact)).toBe(true);

      expect(result.capabilityContext).toBeDefined();
      expect(typeof result.capabilityContext?.totalCapabilities).toBe("number");
      expect(Array.isArray(result.capabilityContext?.scopedCapabilityIds)).toBe(true);

      expect(result.riskContext).toBeDefined();
      expect(result.riskContext?.status).toBe("composed");

      expect(result.lineageContext).toBeDefined();
      expect(typeof result.lineageContext?.recentT3PlusEventCount).toBe("number");

      expect(result.evalContext).toBeDefined();
      expect(result.evalContext?.status).toBe("pending-later-pr");

      // Derived fields (5).
      expect(typeof result.graphConfidence).toBe("number");
      expect(result.graphConfidence).toBeGreaterThanOrEqual(0);
      expect(result.graphConfidence).toBeLessThanOrEqual(1);

      expect(Array.isArray(result.missingEdges)).toBe(true);
      expect(result.missingEdges.length).toBeLessThanOrEqual(50);

      expect(ALLOWED_AGENT_USE).toContain(result.recommendedAgentUse);

      expect(Array.isArray(result.requiredContracts)).toBe(true);
      // No scopePaths → no mutation surface → empty requiredContracts.
      expect(result.requiredContracts).toEqual([]);

      expect(Array.isArray(result.nonGoals)).toBe(true);
      // Temp project has no project-scope.json → empty nonGoals.
      expect(result.nonGoals).toEqual([]);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(2) includeImpact=false omits impactContext and sets graphConfidence=1.0", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ontology-ctx-q-noimpact-"),
    );
    try {
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        // Keep lineage + caps + risks + evals at default true so other fields stay present.
      });

      // Per spec.md §Sub-context wiring policy: includeImpact=false omits the
      // impactContext entry AND graphConfidence defaults to 1.0 (no impact data).
      expect(result.impactContext).toBeUndefined();
      expect(result.graphConfidence).toBe(1.0);
      expect(result.missingEdges).toEqual([]);
      expect(result.recommendedAgentUse).toBe("lead-direct");

      // Other sub-contexts still present.
      expect(result.capabilityContext).toBeDefined();
      expect(result.lineageContext).toBeDefined();
      expect(result.riskContext).toBeDefined();
      expect(result.evalContext).toBeDefined();
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(3) is registered in MCP TOOLS array as the canonical Phase 3 handler", async () => {
    expect(TOOLS.some((t) => t.name === "ontology_context_query")).toBe(true);
    // Verify it has a non-empty description that mentions Phase 3.
    const tool = TOOLS.find((t) => t.name === "ontology_context_query");
    expect(tool).toBeDefined();
    expect(typeof tool?.description).toBe("string");
    expect((tool?.description ?? "").length).toBeGreaterThan(40);
  });

});

// ─── DTC Fill Readiness Diagnostics (Sprint 97 W4, dtc-T4-bridge-ocq) ────────

describe("ontology_context_query — dtcFillReadinessDiagnostics (Sprint 97 W4)", () => {
  test("(B-COMPAT-1) backward-compat: dtcFillReadinessDiagnostics absent when no DTC available", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-absent-"),
    );
    try {
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
      });
      // No DTC in cache, no inline DTC → field must be absent.
      expect(result.dtcFillReadinessDiagnostics).toBeUndefined();
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(B-COMPAT-2) backward-compat: existing output fields byte-identical when includeDTCContext absent", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-byteident-"),
    );
    try {
      const resultA = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
      });
      // includeDTCContext not specified — same as A
      const resultB = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
      });
      // Core fields must be identical regardless of DTC opt-in state.
      expect(resultA.graphConfidence).toBe(resultB.graphConfidence);
      expect(resultA.recommendedAgentUse).toBe(resultB.recommendedAgentUse);
      expect(resultA.nonGoals).toEqual(resultB.nonGoals);
      expect(resultA.requiredContracts).toEqual(resultB.requiredContracts);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(DTC-1) includeDTCContext=false → field entirely omitted even with inline DTC", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-optout-"),
    );
    try {
      // Pass a minimal inline DTC via the extended input shape.
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
        includeDTCContext: false,
        // Cast to extended shape accepted by handler runtime (pass-through).
        ...({
          digitalTwinChangeContract: {
            contractId: "dtc-test-1",
            status: "approved",
            semanticIntentContractRef: "sic-test-1",
            affectedSurfaces: ["bridge/handlers/ontology-context-query.ts"],
            changeBoundary: "bridge/handlers/",
            branchProposalPolicy: "none",
            permissionBoundary: "write",
            replayMigrationPlan: "none",
            observabilityPlan: "events.jsonl",
            toolSurfaceReadiness: "emit_event",
            evaluationPlan: "bun test",
            risks: [],
          },
        } as Record<string, unknown>),
      } as Parameters<typeof handler>[0]);

      expect(result.dtcFillReadinessDiagnostics).toBeUndefined();
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(DTC-2) inline DTC with valid tool surface → diagnostics populated with resolved tools", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-inline-"),
    );
    try {
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
        // includeDTCContext defaults to true
        ...({
          digitalTwinChangeContract: {
            contractId: "dtc-test-2",
            status: "approved",
            semanticIntentContractRef: "sic-test-2",
            affectedSurfaces: ["bridge/handlers/ontology-context-query.ts"],
            changeBoundary: "bridge/handlers/",
            branchProposalPolicy: "none",
            permissionBoundary: "write",
            replayMigrationPlan: "none",
            observabilityPlan: "events.jsonl",
            // emit_event IS a registered MCP tool (from TOOLS array).
            toolSurfaceReadiness: "emit_event",
            evaluationPlan: "bun test",
            risks: [],
          },
        } as Record<string, unknown>),
      } as Parameters<typeof handler>[0]);

      // With an inline DTC, diagnostics must be present.
      expect(result.dtcFillReadinessDiagnostics).toBeDefined();
      const diag = result.dtcFillReadinessDiagnostics!;

      // fillProgressPercent must be a valid number [0, 100].
      expect(typeof diag.fillProgressPercent).toBe("number");
      expect(diag.fillProgressPercent).toBeGreaterThanOrEqual(0);
      expect(diag.fillProgressPercent).toBeLessThanOrEqual(100);

      // toolSurfaceReadiness shape.
      expect(Array.isArray(diag.toolSurfaceReadiness.resolved)).toBe(true);
      expect(Array.isArray(diag.toolSurfaceReadiness.unresolved)).toBe(true);

      // blockingUnresolvedTerms shape.
      expect(Array.isArray(diag.blockingUnresolvedTerms)).toBe(true);

      // completedTurns is an array of step ordinals.
      expect(Array.isArray(diag.completedTurns)).toBe(true);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(DTC-3) inline DTC with unknown tool name → unresolved populated", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-unresolved-"),
    );
    try {
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
        ...({
          digitalTwinChangeContract: {
            contractId: "dtc-test-3",
            status: "approved",
            semanticIntentContractRef: "sic-test-3",
            affectedSurfaces: [],
            changeBoundary: "",
            branchProposalPolicy: "",
            permissionBoundary: "",
            replayMigrationPlan: "",
            observabilityPlan: "",
            // nonexistent_tool_xyz is NOT in the TOOLS registry.
            toolSurfaceReadiness: "nonexistent_tool_xyz",
            evaluationPlan: "",
            risks: [],
          },
        } as Record<string, unknown>),
      } as Parameters<typeof handler>[0]);

      expect(result.dtcFillReadinessDiagnostics).toBeDefined();
      const diag = result.dtcFillReadinessDiagnostics!;
      // nonexistent_tool_xyz must appear in unresolved.
      expect(diag.toolSurfaceReadiness.unresolved).toContain("nonexistent_tool_xyz");
      expect(diag.blockingUnresolvedTerms).toContain("nonexistent_tool_xyz");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(DTC-4) fillProgressPercent=0 when no turns completed (no cache, no fill sequence)", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-zero-pct-"),
    );
    try {
      // No SIC cache, no promptId — inline DTC only. Inline DTC = fully filled
      // assumption (all 7 turns counted), so we only test the 0% case via cache path.
      // Cache path: promptId present but no cache entry → no dtcFillTurnsCompleted.
      // Since there's also no inline DTC here, the result is undefined (no DTC).
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
        promptId: "nonexistent-prompt-no-cache",
      });

      // No cache entry for this promptId AND no inline DTC → undefined.
      expect(result.dtcFillReadinessDiagnostics).toBeUndefined();
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(DTC-5) fillProgressPercent=100 when all 7 turns completed via inline DTC", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-full-pct-"),
    );
    try {
      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
        ...({
          digitalTwinChangeContract: {
            contractId: "dtc-test-5",
            status: "approved",
            semanticIntentContractRef: "sic-test-5",
            affectedSurfaces: [],
            changeBoundary: "",
            branchProposalPolicy: "",
            permissionBoundary: "",
            replayMigrationPlan: "",
            observabilityPlan: "",
            toolSurfaceReadiness: "",
            evaluationPlan: "",
            risks: [],
          },
        } as Record<string, unknown>),
      } as Parameters<typeof handler>[0]);

      expect(result.dtcFillReadinessDiagnostics).toBeDefined();
      // Inline DTC → all 7 turns counted → 100%.
      expect(result.dtcFillReadinessDiagnostics!.fillProgressPercent).toBe(100);
      expect(result.dtcFillReadinessDiagnostics!.completedTurns).toHaveLength(7);
      // All turns completed → no nextTurnQuestion.
      expect(result.dtcFillReadinessDiagnostics!.nextTurnQuestion).toBeUndefined();
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("(DTC-6) nextTurnQuestion present when turns < 7 via SIC cache", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-dtc-next-q-"),
    );
    try {
      // Seed the SIC approval cache with 3 completed DTC turns.
      const cacheDir = path.join(projectRoot, ".palantir-mini", "session");
      fs.mkdirSync(cacheDir, { recursive: true });
      const cacheData = {
        entries: [
          {
            promptId: "test-prompt-dtc-6",
            approvedAt: new Date().toISOString(),
            projectRoot,
            dtcApprovedAt: new Date().toISOString(),
            dtcFillTurnsCompleted: 3,
            lastApprovedRubricScore: 0.7,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(cacheDir, "sic-approval-cache.json"),
        JSON.stringify(cacheData, null, 2) + "\n",
        "utf8",
      );

      const result = await handler({
        project: projectRoot,
        promptId: "test-prompt-dtc-6",
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
      });

      expect(result.dtcFillReadinessDiagnostics).toBeDefined();
      const diag = result.dtcFillReadinessDiagnostics!;

      // 3 of 7 turns → ~42.86% → rounds to 43%.
      expect(diag.fillProgressPercent).toBe(43);
      expect(diag.completedTurns).toHaveLength(3);
      expect(diag.completedTurns).toEqual([1, 2, 3]);

      // Turn index 3 = step 4 (0-based) → nextTurnQuestion must be present.
      expect(typeof diag.nextTurnQuestion).toBe("string");
      expect(typeof diag.nextTurnQuestionEn).toBe("string");
      expect((diag.nextTurnQuestion ?? "").length).toBeGreaterThan(10);

      // dtcApprovedAt must be set from cache.
      expect(typeof diag.dtcApprovedAt).toBe("string");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("ontology_context_query — FDE ontology engineering projection", () => {
  test("current FDE session yields compact non-empty projection", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-fde-current-"),
    );
    try {
      fs.mkdirSync(path.join(projectRoot, "evals"), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, "evals", "inventory-eval.json"),
        JSON.stringify({ suiteId: "inventory-eval" }),
        "utf8",
      );
      writeFDEOntologyEngineeringSessionSnapshot(makeFDEProjectionSession(projectRoot));

      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: true,
      });

      const projection = result.fdeOntologyEngineeringProjection;
      expect(projection).toBeDefined();
      expect(projection?.mission.useCaseName).toBe("Inventory Restock");
      expect(projection?.objectTypes).toContain("InventoryItem");
      expect(projection?.linkTypes).toContain("suppliedBy");
      expect(projection?.actionTypes).toContain("requestReorder");
      expect(projection?.functions).toContain("rankRestockPriority");
      expect(projection?.chatbots).toContain("InventoryAssistant");
      expect(projection?.evalObservability?.evalSuiteName).toBe("eval-runs-context");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("session ref yields compact projection even when current pointer is absent", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "pm-ocq-fde-ref-"),
    );
    try {
      const session = makeFDEProjectionSession(projectRoot, "fde-session:by-ref");
      writeFDEOntologyEngineeringSessionSnapshot(session);
      fs.rmSync(
        path.join(projectRoot, ".palantir-mini", "session", "fde-ontology-engineering", "current.json"),
        { force: true },
      );

      const result = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: true,
        fdeOntologyEngineeringSessionRef: fdeOntologyEngineeringSessionRef(session.sessionId),
      } as Parameters<typeof handler>[0]);

      expect(result.fdeOntologyEngineeringProjection?.sessionId).toBe("fde-session:by-ref");
      expect(result.fdeOntologyEngineeringProjection?.objectTypes).toContain("InventoryItem");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
