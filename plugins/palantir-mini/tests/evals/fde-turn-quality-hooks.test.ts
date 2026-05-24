import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { handleFDEOntologyTurn } from "../../bridge/handlers/fde-ontology-turn";
import { HANDLER_MODULES, TOOLS } from "../../bridge/mcp-server";
import { buildFDESemanticIntentContext } from "../../lib/fde-ontology-engineering/semantic-intent-context";
import {
  fdeOntologyEngineeringSessionDir,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../lib/fde-ontology-engineering/session-store";
import type { FDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/types";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
} from "../../lib/prompt-front-door";
import suiteDeclaration from "../../eval-suites/fde-turn-quality-hooks.json";

interface FDETurnEvalCase {
  readonly id: string;
  readonly title: string;
  readonly category:
    | "prompt_persistence"
    | "sidecar_lead_card"
    | "readiness_eval_observability"
    | "non_public_boundary";
  readonly run: () => Promise<{
    readonly passed: boolean;
    readonly details: string;
    readonly metrics?: Record<string, unknown>;
  }> | {
    readonly passed: boolean;
    readonly details: string;
    readonly metrics?: Record<string, unknown>;
  };
}

function makeProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-turn-eval-"));
  fs.writeFileSync(path.join(project, "package.json"), "{\"name\":\"fde-turn-eval\"}\n");
  return project;
}

function fixtureSession(projectRoot: string): FDEOntologyEngineeringSession {
  const createdAt = "2026-05-21T10:20:00.000Z";
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-ontology-engineering:turn-quality-eval",
    projectRoot,
    universalOntologyEntryRef: "universal-ontology-entry://fde-turn-quality-eval",
    ontologyContextQueryRef: "ontology-context-query://fde-turn-quality-eval",
    workflowTraceRef: "workflow-lineage://fde-turn-quality-eval",
    phase: "governance-eval",
    turnCount: 0,
    userFacingSummary: "Evaluate FDE turn quality and hook enforcement boundaries.",
    confirmedUserGoal:
      "Design FDE turn quality checks with observable readiness and non-public handler boundaries.",
    confirmedNonGoals: [
      "Do not authorize mutation from the Lead card.",
      "Do not persist raw user prompt text.",
    ],
    latentHypotheses: [
      {
        hypothesisId: "hypothesis:eval-observability",
        status: "inferred",
        family: "eval-readiness",
        ruleId: "fde.eval-observability.required",
        confidence: 0.91,
        decisionAxis: "governance",
        readinessRequirementIds: ["evaluation", "evidence-classification"],
        plainLanguage:
          "FDE turn quality needs deterministic eval observability before contract drafting.",
        whyLeadInferredThis:
          "The implementation contract explicitly asks for readiness and eval observability.",
        whatUserMayNotHaveNoticed:
          "A public MCP handler is not required for deterministic eval inventory coverage.",
        recommendedDefault:
          "Keep FDE turn execution internal and expose readiness through eval data/tests.",
        riskIfWrong:
          "A hidden readiness gap could make hook enforcement look complete while eval coverage is absent.",
        whatWillNotHappenIfAccepted: [
          "No public MCP tool will be registered by this eval.",
          "No runtime mutation will be authorized by the Lead card.",
        ],
        ontologyImplication: {
          possibleObjects: ["FDETurnQualitySignal"],
          possibleLinks: ["observesReadiness"],
          possibleActions: [],
          possibleFunctions: ["classifyFDETurnReadiness"],
        },
        evidenceNeeded: ["eval-suite:fde-turn-quality-hooks"],
        sourceRefs: ["reference_only:eval-suite:fde-turn-quality-hooks"],
      },
    ],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    missionModel: {
      useCaseName: "FDE Turn Quality Hooks",
      operationalDecision:
        "Use deterministic FDE turn eval cases to verify hook enforcement boundaries.",
      decisionOwnerRole: "Lead",
      successSignals: ["FDE eval suite passes deterministic tests."],
    },
    evidenceModel: {
      evidenceDefinition:
        "Evaluation cases verify prompt persistence, sidecar/card invariants, readiness, and public handler boundaries.",
      observableSignals: ["readiness profile score", "eval case pass rate"],
      sourceArtifactRefs: ["reference_only:eval-suite:fde-turn-quality-hooks"],
      missingEvidenceQuestions: [],
    },
    objectCandidates: [
      {
        candidateId: "object:fde-turn-quality-signal",
        plainName: "FDETurnQualitySignal",
        whyItMayMatter: "Captures deterministic quality evidence for each turn.",
        evidenceRefs: ["eval-suite:fde-turn-quality-hooks"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "link:observes-readiness",
        plainName: "observesReadiness",
        sourceObject: "FDETurnQualitySignal",
        targetObject: "FDEReadinessProfile",
        businessMeaning: "Connects turn quality evidence to readiness status.",
        evidenceRefs: ["eval-suite:fde-turn-quality-hooks"],
      },
    ],
    actionCandidates: [],
    functionCandidates: [
      {
        candidateId: "function:classify-fde-turn-readiness",
        plainName: "classifyFDETurnReadiness",
        logicIntent: "Classify deterministic readiness evidence for FDE turn quality.",
        deterministic: true,
        evidenceRefs: ["eval-suite:fde-turn-quality-hooks"],
      },
    ],
    chatbotContextCandidates: [
      {
        candidateId: "chatbot-context:fde-lead-state",
        plainName: "FDELeadApplicationState",
        applicationStateNeed:
          "Show accepted hypotheses, blocking questions, readiness, and eval observability.",
        retrievalContextNeed: "Retrieve FDE sidecar and readiness profile evidence.",
        evidenceRefs: ["eval-suite:fde-turn-quality-hooks"],
      },
    ],
    contextEngineeringPlan: {
      planId: "context-plan:fde-turn-quality",
      dataSummary: "FDE session, sidecar, lead card, and readiness profile.",
      logicSummary: "Deterministic eval assertions only.",
      actionSummary: "No mutation authorized from eval execution.",
      sourceRefs: ["eval-suite:fde-turn-quality-hooks"],
    },
    readinessProfileId: "chatbot-studio-design",
    semanticIntentContractRef: undefined,
    digitalTwinChangeContractRef: undefined,
    unresolvedQuestions: [],
    sourceRefs: ["reference_only:eval-suite:fde-turn-quality-hooks"],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt,
    updatedAt: createdAt,
  };
}

async function createPromptWithoutRaw(projectRoot: string) {
  const store = new PromptFrontDoorStore({ projectRoot });
  const envelope = createPromptEnvelope({
    rawPrompt: "Assess FDE turn quality without retaining raw prompt text.",
    sessionId: "session-fde-turn-eval",
    runtime: "codex",
    projectRoot,
    capturedAt: "2026-05-21T10:20:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return envelope;
}

async function runFDETurn(projectRoot: string, rawSecret = "RAW_SECRET_DO_NOT_PERSIST") {
  const session = fixtureSession(projectRoot);
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return handleFDEOntologyTurn({
    projectRoot,
    sessionId: session.sessionId,
    sanitizedTurnSummary:
      "Accepted eval-observability hypothesis and kept mutation authorization out of the card.",
    rawUserMessage: `Sensitive original user text ${rawSecret}`,
    acceptedHypothesisIds: ["hypothesis:eval-observability"],
    emittedAt: "2026-05-21T10:21:00.000Z",
  });
}

function makeEvalCases(): FDETurnEvalCase[] {
  return [
    {
      id: "testcase:fde-turn-no-raw-prompt-persistence",
      title: "FDE turn stores hashes and sanitized summaries instead of raw prompt text",
      category: "prompt_persistence",
      async run() {
        const project = makeProject();
        try {
          const envelope = await createPromptWithoutRaw(project);
          const secret = "RAW_SECRET_DO_NOT_PERSIST";
          const result = await runFDETurn(project, secret);
          const fdeDir = fdeOntologyEngineeringSessionDir(project, result.session.sessionId);
          const fdeFiles = fs.readdirSync(fdeDir, { recursive: true }).map((entry) =>
            path.join(fdeDir, String(entry))
          ).filter((entry) => fs.statSync(entry).isFile());
          const combinedFDEState = fdeFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
          const passed =
            envelope.rawPrompt === undefined &&
            result.session.recentTurnSummaries[0]?.leadSummary.includes(secret) === false &&
            !combinedFDEState.includes(secret) &&
            combinedFDEState.includes("userMessageHash");
          return {
            passed,
            details: passed
              ? "Envelope omitted rawPrompt and FDE turn files stored only hash/sanitized summary."
              : "Raw prompt text leaked into persisted FDE turn state.",
            metrics: { fdeFileCount: fdeFiles.length },
          };
        } finally {
          fs.rmSync(project, { recursive: true, force: true });
        }
      },
    },
    {
      id: "testcase:fde-turn-sidecar-lead-card-invariants",
      title: "FDE sidecar and lead cards preserve non-mutating invariants",
      category: "sidecar_lead_card",
      async run() {
        const project = makeProject();
        try {
          const result = await runFDETurn(project);
          const passed =
            result.sidecar.contextId === result.sidecarRef &&
            result.sidecar.sessionId === result.session.sessionId &&
            result.leadCard.semanticIntentContextRef === result.sidecarRef &&
            result.leadCardV2.semanticIntentContextRef === result.sidecarRef &&
            result.leadCard.mutationAuthorizedFromCard === false &&
            result.leadCardV2.mutationAuthorizedFromCard === false &&
            result.leadCardV2.whatWillNotHappen.some((item) =>
              item.includes("authorize project mutation")
            );
          return {
            passed,
            details: passed
              ? "Sidecar and both Lead cards preserve session refs and non-mutating invariants."
              : "Sidecar/card invariant mismatch.",
            metrics: { nextActionCount: result.nextActions.length },
          };
        } finally {
          fs.rmSync(project, { recursive: true, force: true });
        }
      },
    },
    {
      id: "testcase:fde-turn-readiness-eval-observability",
      title: "FDE turn exposes readiness and eval observability",
      category: "readiness_eval_observability",
      async run() {
        const project = makeProject();
        try {
          const result = await runFDETurn(project);
          const readiness = result.grade.readinessProfile ??
            buildFDESemanticIntentContext(result.session).readinessProfile;
          const evaluation = readiness?.requirementResults.find((item) =>
            item.requirementId === "evaluation"
          );
          const passed =
            result.grade.verdict === "ready-for-semantic-contract" &&
            readiness?.readyForSemanticIntent === true &&
            readiness.missingRequired.length === 0 &&
            evaluation?.satisfied === true &&
            evaluation.evidence.length > 0;
          return {
            passed,
            details: passed
              ? "Readiness profile exposes satisfied eval-observability evidence."
              : `Unexpected readiness verdict: ${result.grade.verdict}`,
            metrics: {
              score: readiness?.score,
              missingRequired: readiness?.missingRequired.length,
              evaluationEvidenceCount: evaluation?.evidence.length ?? 0,
            },
          };
        } finally {
          fs.rmSync(project, { recursive: true, force: true });
        }
      },
    },
    {
      id: "testcase:fde-turn-handler-non-public-boundary",
      title: "Internal FDE turn/readiness handlers stay out of public MCP tools",
      category: "non_public_boundary",
      run() {
        const publicToolNames = TOOLS.map((tool) => tool.name);
        const publicHandlerModules = Object.values(HANDLER_MODULES);
        const passed =
          !publicToolNames.includes("fde_ontology_turn") &&
          !publicToolNames.includes("grade_fde_readiness") &&
          !publicHandlerModules.includes("./handlers/fde-ontology-turn") &&
          !publicHandlerModules.includes("./handlers/grade-fde-readiness");
        return {
          passed,
          details: passed
            ? "FDE turn/readiness handlers are not public MCP tools."
            : "FDE internal handler leaked into public MCP surface.",
          metrics: { publicToolCount: publicToolNames.length },
        };
      },
    },
  ];
}

describe("FDE Turn Quality + Hook Enforcement eval suite", () => {
  test("suite declaration matches executable cases", () => {
    const cases = makeEvalCases();
    expect(cases.map((testCase) => testCase.id)).toEqual(suiteDeclaration.suite.testCaseIds);
    expect(suiteDeclaration.suite.evaluatorPolicy.minimumPassingScore).toBe(1);
    expect(suiteDeclaration.suite.evaluatorPolicy.requireHumanReviewForMutation).toBe(true);
  });

  test("runs deterministic FDE turn quality cases", async () => {
    const results = [];
    for (const evalCase of makeEvalCases()) {
      results.push({ evalCase, result: await evalCase.run() });
    }
    const failed = results.filter(({ result }) => !result.passed);
    if (failed.length > 0) {
      console.error(
        failed.map(({ evalCase, result }) => `${evalCase.id}: ${result.details}`).join("\n"),
      );
    }

    expect(failed).toHaveLength(0);
    expect(results).toHaveLength(4);
    expect(results.map(({ evalCase }) => evalCase.category)).toEqual([
      "prompt_persistence",
      "sidecar_lead_card",
      "readiness_eval_observability",
      "non_public_boundary",
    ]);
  });
});
