import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import handler from "../../../bridge/handlers/ontology-context-query";
import { composeFDEOntologyBuildSession } from "../../../lib/fde-build/session-composer";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

function makeFDESession(projectRoot: string): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-session:projection-test",
    projectRoot,
    universalOntologyEntryRef: "universal-ontology-entry://test",
    ontologyContextQueryRef: "ontology-context-query://test",
    phase: "governance-eval",
    turnCount: 2,
    userFacingSummary: "Review inventory restock decisions for store operators.",
    confirmedUserGoal: "Help operators decide which item to restock first.",
    confirmedNonGoals: ["Do not authorize writeback from preview."],
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
    evidenceModel: {
      evidenceDefinition: "Stock level, demand, and supplier lead time.",
      observableSignals: ["low-stock", "lead-time"],
      sourceArtifactRefs: ["dataset:inventory"],
      missingEvidenceQuestions: [],
    },
    objectCandidates: [
      {
        candidateId: "object:item",
        plainName: "InventoryItem",
        whyItMayMatter: "The item is the core decision subject.",
        evidenceRefs: ["dataset:inventory"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "link:item-supplier",
        plainName: "suppliedBy",
        sourceObject: "InventoryItem",
        targetObject: "Supplier",
        businessMeaning: "Supplier that can replenish an item.",
        evidenceRefs: ["dataset:suppliers"],
      },
    ],
    actionCandidates: [
      {
        candidateId: "action:reorder",
        plainName: "requestReorder",
        operationalIntent: "Record that an operator requested replenishment.",
        writebackRisk: "medium",
        evidenceRefs: ["workflow:reorder"],
      },
    ],
    functionCandidates: [
      {
        candidateId: "function:rank",
        plainName: "rankRestockPriority",
        logicIntent: "Score restock urgency from stock level and demand.",
        deterministic: true,
        evidenceRefs: ["logic:priority"],
      },
    ],
    chatbotContextCandidates: [
      {
        candidateId: "chatbot:assistant",
        plainName: "InventoryAssistant",
        applicationStateNeed: "selectedStoreId",
        retrievalContextNeed: "inventory policy notes",
        evidenceRefs: ["app:chatbot"],
      },
    ],
    semanticIntentContractRef: "sic:inventory",
    digitalTwinChangeContractRef: "dtc:inventory",
    unresolvedQuestions: [],
    stableSummary: {
      confirmedIntent: "Inventory restock ontology review.",
      missionSummary: "Decide which item needs restock first.",
      evidenceSummary: "Inventory and supplier evidence.",
      ontologySummary: "Item, supplier, reorder action, priority function.",
      governanceSummary: "Read-only preview.",
      acceptedHypothesisCount: 0,
      rejectedHypothesisCount: 0,
      deferredHypothesisCount: 0,
      unresolvedBlockingQuestionCount: 0,
      sourceTurnIds: ["turn-1"],
      updatedAt: "2026-05-21T00:00:00.000Z",
    },
    phaseHistory: [],
    sourceRefs: ["universal-ontology-entry://test"],
    recentTurnSummaries: [
      {
        turnId: "turn-1",
        turnIndex: 0,
        leadSummary: "Mission and ontology candidates accepted.",
        emittedAt: "2026-05-21T00:00:00.000Z",
      },
    ],
    turnRecordIds: ["turn-1"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

describe("FDE context adapter", () => {
  test("real ontology_context_query output plus FDE session composes all projection levels", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-adapter-"));
    try {
      fs.mkdirSync(path.join(projectRoot, "evals"), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, "evals", "inventory-eval.json"),
        JSON.stringify({ suiteId: "inventory-eval" }),
        "utf8",
      );

      const ontologyContext = await handler({
        project: projectRoot,
        includeImpact: false,
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: true,
      });
      const session = composeFDEOntologyBuildSession({
        project: projectRoot,
        ontologyContext,
        fdeOntologyEngineeringSession: makeFDESession(projectRoot),
        nowIso: "2026-05-21T00:00:00.000Z",
      });

      expect(session.missionDecision?.useCaseName).toBe("Inventory Restock");
      expect(session.objectTypes.map((item) => item.objectTypeName)).toContain("InventoryItem");
      expect(session.linkTypes.map((link) => link.linkTypeName)).toContain("suppliedBy");
      expect(session.actionWriteback.map((action) => action.actionTypeName)).toContain("requestReorder");
      expect(session.functions.map((fn) => fn.functionName)).toContain("rankRestockPriority");
      expect(session.chatbotStudio.map((chatbot) => chatbot.chatbotName)).toContain("InventoryAssistant");
      expect(session.evalObservability?.evalSuiteName).toBe("eval-runs-context");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("evalRunsContext feeds evalObservability as observability evidence only", () => {
    const projectRoot = "/tmp/pm-fde-evalruns";
    const session = composeFDEOntologyBuildSession({
      project: projectRoot,
      ontologyContext: {
        evalRunsContext: {
          recentRuns: [
            {
              runId: "run-1",
              suiteId: "suite-restock",
              target: { kind: "mcp-tool", rid: "function:rankRestockPriority" },
              status: "passed",
              startedAt: "2026-05-21T00:00:00.000Z",
              aggregateScore: 0.9,
            },
          ],
          lastRunAt: "2026-05-21T00:00:00.000Z",
          perVerdictCounts: { pass: 1, revise: 0, reject: 0 },
        },
      },
      fdeOntologyEngineeringSession: makeFDESession(projectRoot),
      nowIso: "2026-05-21T00:00:00.000Z",
    });

    expect(session.evalObservability?.evalSuiteName).toBe("suite-restock");
    expect(session.evalObservability?.latestPassRate).toBe(1);
    expect(session.evalObservability?.passCriteria).toContain("semantic authority remains SIC/DTC");
    expect(session.evalObservability?.auditSessionTraceEvidence).toContain("evalRun:run-1");
  });

  test("derived evalObservability supplies chatbot evalSuite when only eval coverage exists", () => {
    const projectRoot = "/tmp/pm-fde-derived-eval-suite";
    const session = composeFDEOntologyBuildSession({
      project: projectRoot,
      ontologyContext: {
        retrievalContext: {
          evalCoverage: {
            suiteCount: 1,
            suitePaths: ["evals/inventory-eval.json"],
          },
        },
      },
      fdeOntologyEngineeringSession: makeFDESession(projectRoot),
      nowIso: "2026-05-21T00:00:00.000Z",
    });

    expect(session.evalObservability?.evalSuiteName).toBe("eval-runs-context");
    expect(session.chatbotStudio[0]?.evalSuite).toBe("eval-runs-context");
    expect(
      session.topGaps.some((gap) => gap.gapId.includes("gap-chatbot-eval")),
    ).toBe(false);
  });
});
