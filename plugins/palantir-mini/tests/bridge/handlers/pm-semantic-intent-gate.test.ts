import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  semanticIntentGate,
} from "../../../bridge/handlers/pm-semantic-intent-gate";
import {
  createUserApprovalRef,
  createPromptEnvelope,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
} from "../../../lib/prompt-front-door";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";
import {
  EIGHT_TURN_FILL_SEQUENCE,
  advanceFillSequence,
  isFillComplete,
  type SicWithFillFields,
} from "../../../lib/semantic-intent/fill-sequence";
import { validateDtcApprovalCardText } from "../../../lib/ontology-engineering-response-template";
import {
  crmBillingSupportCustomerFixture,
  overloadedCustomerFixture,
} from "../../../lib/semantic-consistency/fixtures";
import { resolveSemanticConsistency } from "../../../lib/semantic-consistency/resolver";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};
const approvedSemanticConsistencyResult = resolveSemanticConsistency(
  crmBillingSupportCustomerFixture(),
);

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-semantic-intent-gate-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function readEvents(project: string): Array<{
  type: string;
  payload?: Record<string, unknown>;
  withWhat?: Record<string, unknown>;
}> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

async function createCapturedPrompt(project: string, rawPrompt: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt,
    sessionId: "session-gate",
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-05-10T04:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return { store, envelope };
}

function approvedSemantic(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved:prompt-front-door",
    status: "approved",
    rawIntent: "Persist prompt-front-door contracts",
    confirmedIntent: "Persist prompt-front-door contracts for semantic gate continuity.",
    nonGoals: ["Do not promote generated schemas in this wave."],
    approvedNouns: ["PromptEnvelope", "SemanticIntentContract", "DigitalTwinChangeContract"],
    approvedVerbs: ["persist", "validate", "route"],
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/lib/prompt-front-door/store.ts",
      ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
    ],
    approvedCanonicalTermRefs: [...approvedSemanticConsistencyResult.canonicalTermRefs],
    approvedTermMappingRefs: approvedSemanticConsistencyResult.mappings.map(
      (mapping) => mapping.mappingId,
    ),
    semanticConsistencyResultRef: approvedSemanticConsistencyResult.resolverRunId,
    permissionsAndProposal: "Approved for Wave 3 plugin-local persistence only.",
    acceptedRisks: [],
    downstreamAllowed: ["Persist approved contract records."],
    downstreamForbidden: ["Do not switch enforcement gates to blocking in Wave 3."],
    clarificationQuestions: [],
    approvalRef: "user:approved:wave3",
    ...overrides,
  };
}

function approvedDigitalTwin(
  semanticRef = "semantic-intent:approved:prompt-front-door",
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:approved:prompt-front-door",
    status: "approved",
    semanticIntentContractRef: semanticRef,
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/lib/prompt-front-door/store.ts",
      ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
    ],
    changeBoundary: "Plugin-local prompt-front-door persistence only.",
    branchProposalPolicy: "Ship as Wave 3 after Wave 2 is merged.",
    permissionBoundary: "No direct home plugin sync in this PR.",
    replayMigrationPlan: "No replay migration; additive prompt-front-door files only.",
    observabilityPlan: "Emit gate/router events with prompt identity refs.",
    toolSurfaceReadiness: "Codex and Claude pass refs through additive fields.",
    evaluationPlan: "Targeted typecheck and handler/store tests.",
    touchedOntologyRefs: [
      { kind: "ObjectType", rid: "object-type:prompt-envelope" } as never,
      { kind: "LinkType", rid: "link-type:prompt-envelope-contract" } as never,
      { kind: "ActionType", rid: "action-type:approve-prompt-contract" } as never,
      { kind: "Function", rid: "function:validate-prompt-contract" } as never,
    ],
    requiredEvaluationRefs: [
      { kind: "ValidationPack", rid: "validation-pack:prompt-front-door" } as never,
    ],
    requiredBranchPolicyRef: {
      rid: "branch-policy:prompt-front-door",
      displayName: "Prompt front-door branch proposal policy",
    } as never,
    requiredPermissionPolicyRef: {
      rid: "permission-policy:prompt-front-door",
      displayName: "Prompt front-door authoring permissions",
    } as never,
    semanticConsistencyRefs: [approvedSemanticConsistencyResult.resolverRunId],
    fillPolicy: "ontology-dtc-build",
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-05-27T00:00:00.000Z",
      source: "agent",
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: ["object-type:prompt-envelope"],
      linkTypeRefs: ["link-type:prompt-envelope-contract"],
      actionTypeRefs: ["action-type:approve-prompt-contract"],
      functionRefs: ["function:validate-prompt-contract"],
      applicationStateRefs: ["application-state:prompt-front-door-review"],
      evaluationRefs: ["validation-pack:prompt-front-door"],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    approvalRef: "user:approved:wave3",
    ...overrides,
  } as unknown as DigitalTwinChangeContract;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.HOME = process.env.HOME;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) {
    delete process.env.PALANTIR_MINI_PROJECT;
  } else {
    process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  }
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  } else {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  }
  if (savedEnv.HOME === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = savedEnv.HOME;
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("pm_semantic_intent_gate", () => {
  test("returns draft contracts for complex ontology-affecting work", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement Scene3D ontology, geometry3D, and renderer support",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.status).toBe("contract_required");
    expect(result.allowsRouting).toBe(false);
    expect(result.turnCardDecisionQueue.length).toBeGreaterThan(0);
    expect(result.turnCardDecisionQueue[0]?.materiality).toBe("blocking");
    expect(result.turnCardDecisionQueue[0]?.questionId).toBe(
      "semantic-intent.confirm-operational-meaning",
    );
    expect(result.draftContracts?.semanticIntent.status).toBe("draft");
    expect(result.draftContracts?.digitalTwin.status).toBe("draft");
    expect(result.draftContracts?.digitalTwin.contractId).toBe(
      "digital-twin-change:awaiting-approved-sic-fde-context-plan",
    );
    expect(result.draftContracts?.digitalTwin.contractId).not.toContain("scene3d");
    expect(result.draftContracts?.digitalTwin.risks[0]?.riskId).toBe(
      "risk.approved-sic-required-for-dtc-draft",
    );
    expect(result.semanticConversationState?.lifecycle).toBe("clarifying");
    expect(result.semanticConversationState?.contractFacing.dtcReady).toBe(false);
    expect(result.semanticConversationState?.userFacing.unresolvedQuestions.length).toBe(
      result.turnCardDecisionQueue.length,
    );
  });

  test("human collaborative mode returns Korean review cards without raw draft JSON by default", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "palantir-mini 계약 작성 UX를 비전문 사용자도 승인할 수 있게 개선",
      scopePaths: [
        ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
        ".claude/plugins/palantir-mini/bridge/mcp-server.ts",
      ],
      complexityHint: "cross-cutting",
      interactionMode: "human_collaborative",
      userExpertise: "non_programmer",
      preferredLanguage: "ko",
    });

    expect(result.status).toBe("contract_required");
    expect(result.draftContracts).toBeUndefined();
    expect(result.userReviewCard?.title).toBe("Contract 작성 검토 카드");
    expect(result.userReviewCard?.semanticIntentCard.title).toBe("제가 이해한 작업 의미");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.title).toBe("실제 변경 범위 확인");
    expect(result.userReviewCard?.semanticIntentCard.recommendedDirection).toContain("FDE");
    expect(result.userReviewCard?.semanticIntentCard.recommendedDirection).toContain("SIC 승인 경계");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.plainSummary).toContain("prompt를 바로 실행하지 않습니다");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.plainSummary).toContain("ContextEngineeringPlan(DATA/LOGIC/ACTION)");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.recommendedDirection).toContain("라우터");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.recommendedDirection).toContain("work contract");
    expect(result.userReviewCard?.questions.length).toBeLessThanOrEqual(5);
    expect(result.userReviewCard?.questions.length).toBeGreaterThanOrEqual(2);

    for (const question of result.userReviewCard?.questions ?? []) {
      expect(question.userLevel).toBe("non_programmer");
      expect(question.plainQuestion.length).toBeGreaterThan(10);
      expect(question.recommendedAnswer.length).toBeGreaterThan(10);
      expect(question.whyItMatters.length).toBeGreaterThan(10);
      expect(question.choices.length).toBeGreaterThanOrEqual(2);
      expect(question.choices[0]?.label).toBe("추천 경계 확인");
      expect(question.freeTextAllowed).toBe(true);
    }
    expect(validateDtcApprovalCardText(JSON.stringify(result.userReviewCard))).toEqual([]);
  });

  test("human collaborative mode can include draft contracts when explicitly requested", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Show both user card and internal draft contracts for debugging",
      scopePaths: [".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts"],
      complexityHint: "cross-cutting",
      interactionMode: "human_collaborative",
      preferredLanguage: "en",
      includeDrafts: true,
    });

    expect(result.userReviewCard?.title).toBe("Contract Authoring Review");
    expect(result.userReviewCard?.semanticIntentCard.recommendedDirection).toContain("FDE-confirmed meaning");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.plainSummary).toContain("does not execute the raw prompt");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.plainSummary).toContain("ContextEngineeringPlan DATA/LOGIC/ACTION");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.recommendedDirection).toContain("router");
    expect(result.userReviewCard?.digitalTwinBoundaryCard.recommendedDirection).toContain("validation gates");
    expect(result.draftContracts?.semanticIntent.status).toBe("draft");
    expect(result.draftContracts?.digitalTwin.status).toBe("draft");
    expect(result.userReviewCard?.questions[0]?.choices[0]?.label).toBe(
      "Confirm recommendation",
    );
    expect(validateDtcApprovalCardText(JSON.stringify(result.userReviewCard))).toEqual([]);
  });

  test("projects the same workflow turn cards for Claude and Codex before DTC approval", async () => {
    const project = makeTmpProject();
    const rawIntent =
      "Implement contract questions before DigitalTwinChangeContract approval";

    const claudeResult = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      complexityHint: "multi-file",
      runtime: "claude",
      interactionMode: "human_collaborative",
    });
    expect(claudeResult.workflowContract?.runtime).toBe("claude");
    expect(claudeResult.workflowContract?.mutationAuthorized).toBe(false);
    expect(claudeResult.workflowContract?.turnCards.length).toBeGreaterThan(0);

    const codexResult = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      complexityHint: "multi-file",
      runtime: "codex",
      interactionMode: "human_collaborative",
    });
    expect(codexResult.workflowContract?.runtime).toBe("codex");
    expect(codexResult.workflowContract?.mutationAuthorized).toBe(false);
    expect(codexResult.workflowContract?.turnCards).toEqual(
      claudeResult.workflowContract?.turnCards,
    );
  });

  test("human collaborative persistence enters question state before approval", async () => {
    const project = makeTmpProject();
    const rawIntent =
      "Implement SemanticIntentContract approval state machine for ontology-affecting work";
    const { envelope } = await createCapturedPrompt(project, rawIntent);

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: [
        ".claude/plugins/palantir-mini/lib/prompt-front-door/state-machine.ts",
        ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
      ],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      interactionMode: "human_collaborative",
    });

    expect(result.status).toBe("contract_required");
    expect(result.promptEnvelope?.state).toBe("semantic_intent_questions_open");
    expect(result.turnCardDecisionQueue.length).toBeGreaterThan(0);
  });

  test("simulates palantir-math plan ambiguity as workflow turn-card decisions", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent:
        "Use the palantir-math ontology redesign plan to improve semantic understanding across Claude and Codex",
      scopePaths: [
        "ontology/BROWSE.md",
        "ontology/changeContracts.ts",
        "src/generated/change-registry.generated.ts",
        "src/components/sequencer/GraphWorkbenchPanel.tsx",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.status).toBe("contract_required");
    expect(result.turnCardDecisionQueue.length).toBeGreaterThanOrEqual(2);
    for (const question of result.turnCardDecisionQueue.slice(0, 2)) {
      expect(question.decisionSpec.plainKoreanSummary.length).toBeGreaterThan(20);
      expect(question.decisionSpec.choices[0]?.consequence.length).toBeGreaterThan(20);
      expect(question.decisionSpec.choices.length).toBeGreaterThanOrEqual(2);
      expect(question.whyItMatters.length).toBeGreaterThan(20);
    }
    expect(result.draftContracts?.semanticIntent.clarificationQuestions.length).toBe(
      result.turnCardDecisionQueue.length,
    );
  });

  test("read-only triage is not required but includes ambient drafts by default", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Read-only triage of the palantir-math 3D plan and wait",
      scopePaths: ["ontology/data/visual3D.ts"],
      complexityHint: "cross-cutting",
    });

    expect(result.status).toBe("not_required");
    expect(result.allowsRouting).toBe(true);
    expect(result.gate.contractPolicy).toBe("ambient");
    expect(result.gate.recommendedContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);
    expect(result.draftContracts?.semanticIntent.rawIntent).toContain("Read-only");
    expect(result.draftContracts?.semanticIntent.clarificationQuestions).toEqual([]);
  });

  test("ContextEngineeringPlanV2 decisions are preserved in DTC draft when FDE session is available", async () => {
    const project = makeTmpProject();
    const fdeDir = path.join(project, ".palantir-mini", "session", "fde-ontology-engineering");
    fs.mkdirSync(fdeDir, { recursive: true });
    const session = {
      schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
      sessionId: "fde-session:context-plan-v2",
      projectRoot: project,
      universalOntologyEntryRef: "universal-ontology-entry://context-plan-v2",
      phase: "semantic-contract-ready",
      turnCount: 1,
      userFacingSummary: "Draft a context-aware DTC.",
      confirmedUserGoal: "Preserve context engineering decisions in DTC review.",
      confirmedNonGoals: [],
      latentHypotheses: [],
      acceptedHypothesisIds: [],
      rejectedHypothesisIds: [],
      deferredHypothesisIds: [],
      missionModel: { successSignals: ["DTC decisions visible"] },
      evidenceModel: {
        observableSignals: ["required decisions"],
        sourceArtifactRefs: ["docs/context-plan.md"],
        missingEvidenceQuestions: [],
      },
      objectCandidates: [{
        candidateId: "object:decision",
        plainName: "Required Decision",
        whyItMayMatter: "DTC review needs explicit DATA approval.",
        evidenceRefs: ["docs/context-plan.md"],
      }],
      linkCandidates: [],
      actionCandidates: [{
        candidateId: "action:approve",
        plainName: "Approve decision",
        operationalIntent: "Approve DTC decision boundaries.",
        writebackRisk: "medium",
        evidenceRefs: ["docs/context-plan.md"],
      }],
      functionCandidates: [{
        candidateId: "function:evaluate",
        plainName: "Evaluate decision readiness",
        logicIntent: "Check decision completeness.",
        evidenceRefs: ["docs/context-plan.md"],
      }],
      chatbotContextCandidates: [],
      unresolvedQuestions: [],
      sourceRefs: ["docs/context-plan.md"],
      recentTurnSummaries: [],
      turnRecordIds: [],
      createdAt: "2026-05-21T00:00:00.000Z",
      updatedAt: "2026-05-21T00:00:00.000Z",
    };
    fs.writeFileSync(path.join(fdeDir, "fde-session:context-plan-v2.json"), JSON.stringify(session, null, 2));
    fs.writeFileSync(path.join(fdeDir, "current.json"), JSON.stringify({
      schemaVersion: "palantir-mini/fde-ontology-engineering-current/v1",
      sessionId: "fde-session:context-plan-v2",
      sessionRef: "fde-ontology-engineering://session/fde-session:context-plan-v2",
      projectRoot: project,
      updatedAt: "2026-05-21T00:00:00.000Z",
    }, null, 2));

    const result = await semanticIntentGate({
      project,
      rawIntent: "Draft DTC from ContextEngineeringPlanV2",
      scopePaths: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      semanticIntentContract: approvedSemantic({
        affectedSurfaces: ["chatbot-studio-workbench"],
      }),
      includeDrafts: true,
      runtime: "codex",
    });

    const decisions = result.draftContracts?.digitalTwin.requiredUserDecisions ?? [];
    expect(decisions.map((decision) => decision.domain)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(decisions.every((decision) => decision.blocking && decision.status === "open")).toBe(true);
  });

  test("approved SIC without FDE session does not derive DTC from raw intent", async () => {
    const project = makeTmpProject();

    const result = await semanticIntentGate({
      project,
      rawIntent: "Draft a DigitalTwinChangeContract directly from this raw prompt",
      scopePaths: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      semanticIntentContract: approvedSemantic({
        affectedSurfaces: ["workflow-control-plane"],
      }),
      includeDrafts: true,
      runtime: "codex",
    });

    expect(result.draftContracts?.digitalTwin.contractId).toBe(
      "digital-twin-change:awaiting-approved-sic-fde-context-plan",
    );
    expect(result.draftContracts?.digitalTwin.contractId).not.toContain("raw-prompt");
    expect(result.draftContracts?.digitalTwin.risks[0]?.riskId).toBe(
      "risk.fde-session-required-for-dtc-draft",
    );
    expect(result.draftContracts?.digitalTwin.observabilityPlan).toContain(
      "approved SIC, FDE session, ContextEngineeringPlan",
    );
  });

  test("required-only draft mode preserves the legacy no-draft read-only path", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Read-only triage of the palantir-math 3D plan and wait",
      scopePaths: ["ontology/data/visual3D.ts"],
      complexityHint: "cross-cutting",
      draftMode: "required-only",
    });

    expect(result.status).toBe("not_required");
    expect(result.allowsRouting).toBe(true);
    expect(result.draftContracts).toBeUndefined();
  });

  test("emits semantic gate event", async () => {
    const project = makeTmpProject();
    await semanticIntentGate({
      project,
      rawIntent: "Implement Scene3D ontology and renderer support",
      scopePaths: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D"],
      complexityHint: "cross-cutting",
    });

    const event = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        (entry.payload as { errorClass?: string })?.errorClass === "contract_required",
    );
    expect(event).toBeDefined();
    expect(event?.payload?.contractPolicy).toBe("approval-required");
    expect(event?.payload?.projectRoot).toBe(project);
    expect(event?.payload?.runtime).toBe("unknown");
    expect(event?.payload?.memoryLayers).toEqual(["semantic", "procedural"]);
    expect(event?.payload?.semanticConversationStateId).toMatch(/^semantic-conversation:/);
    expect(event?.payload?.semanticConversationLifecycle).toBe("clarifying");
    expect(event?.withWhat?.refinementTarget).toMatchObject({
      kind: "rule-conformance-policy",
      filePathOrRid: "bridge/handlers/pm-semantic-intent-gate.ts",
    });
  });

  test("persists draft semantic and Digital Twin contracts into the prompt-front-door store", async () => {
    const project = makeTmpProject();
    const rawIntent = "Implement prompt-front-door persistence";
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: [".claude/plugins/palantir-mini/lib/prompt-front-door/store.ts"],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    });

    expect(result.contractRefs?.semanticIntentContractRef).toContain(
      "prompt-front-door://contract/semantic-intent/",
    );
    expect(result.contractRefs?.digitalTwinChangeContractRef).toContain(
      "prompt-front-door://contract/digital-twin-change/",
    );
    expect(result.promptEnvelope?.state).toBe("semantic_intent_drafted");

    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);
    const semanticRecord = await store.readContractRecordByRef<SemanticIntentContract>(
      result.contractRefs?.semanticIntentContractRef ?? "",
    );
    const digitalTwinRecord = await store.readContractRecordByRef<DigitalTwinChangeContract>(
      result.contractRefs?.digitalTwinChangeContractRef ?? "",
    );

    expect(saved?.state).toBe("semantic_intent_drafted");
    expect(semanticRecord?.contract.status).toBe("draft");
    expect(digitalTwinRecord?.contract.status).toBe("draft");
    expect(saved?.contractRefs.digitalTwinChangeContractRef).toBe(digitalTwinRecord?.ref);

    const gateEvent = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        entry.payload?.promptId === envelope.promptId,
    );
    expect(gateEvent?.payload?.promptHash).toBe(envelope.promptHash);
    expect(gateEvent?.payload?.runtime).toBe(envelope.runtime);
    expect(gateEvent?.payload?.projectRoot).toBe(project);
    expect(gateEvent?.payload?.memoryLayers).toEqual(["semantic", "procedural"]);
    expect(gateEvent?.payload?.contractRefs).toMatchObject({
      semanticIntentContractRef: semanticRecord?.ref,
      digitalTwinChangeContractRef: digitalTwinRecord?.ref,
    });
  });

  test("resolves prompt envelope from capture project when target project differs", async () => {
    const captureProject = makeTmpProject();
    const targetProject = makeTmpProject();
    const rawIntent = "Implement plugin target work from a home-captured Codex prompt";
    const { store, envelope } = await createCapturedPrompt(captureProject, rawIntent);
    process.env.PALANTIR_MINI_PROJECT = captureProject;

    const result = await semanticIntentGate({
      project: targetProject,
      rawIntent,
      scopePaths: [
        ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
      ],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    });
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(result.promptContinuity?.valid).toBe(true);
    expect(result.promptEnvelope?.projectRoot).toBe(captureProject);
    expect(result.promptEnvelopeLookup).toMatchObject({
      suppliedProject: targetProject,
      selectedPromptFrontDoorRoot: captureProject,
      selectedBy: "env-project",
    });
    expect(result.promptEnvelopeLookup.candidateRootsChecked).toContain(targetProject);
    expect(result.promptEnvelopeLookup.candidateRootsChecked).toContain(captureProject);
    expect(result.contractRefs?.semanticIntentContractRef).toContain(
      "prompt-front-door://contract/semantic-intent/",
    );
    expect(saved?.state).toBe("semantic_intent_drafted");
  });

  test("returns home fallback prompt envelope lookup attribution", async () => {
    const homeProject = makeTmpProject();
    process.env.HOME = homeProject;
    const targetPluginRoot = path.join(homeProject, ".claude", "plugins", "palantir-mini");
    const rawIntent = "Continue plugin work from a home-captured Codex prompt";
    const { envelope } = await createCapturedPrompt(homeProject, rawIntent);

    const result = await semanticIntentGate({
      project: targetPluginRoot,
      rawIntent,
      scopePaths: [
        ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
      ],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      draftMode: "never",
    });

    expect(result.promptContinuity?.valid).toBe(true);
    expect(result.promptEnvelopeLookup).toMatchObject({
      suppliedProject: targetPluginRoot,
      selectedPromptFrontDoorRoot: homeProject,
      selectedBy: "home-fallback",
    });
    expect(result.promptEnvelopeLookup.candidateRootsChecked).toContain(targetPluginRoot);
    expect(result.promptEnvelopeLookup.candidateRootsChecked).toContain(homeProject);
  });

  test("approved prompt envelope state requires approved contracts with approvalRef", async () => {
    const project = makeTmpProject();
    const rawIntent = "Implement SemanticIntentContract gate persistence for ontology execution";
    const scopePaths = [
      "bridge/handlers/pm-semantic-intent-gate.ts",
      "ontology/changeContracts.ts",
    ];
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);

    const blocked = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths,
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemantic({ approvalRef: undefined }),
      digitalTwinChangeContract: approvedDigitalTwin(undefined, { approvalRef: undefined }),
    });

    expect(blocked.status).toBe("blocked_for_clarification");
    expect(blocked.promptEnvelope?.state).not.toBe("digital_twin_approved");

    const partialInline = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths,
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: {
        status: "approved",
        approvalRef: "user:approved:partial",
        affectedSurfaces: scopePaths,
      } as unknown as SemanticIntentContract,
      digitalTwinChangeContract: {
        status: "approved",
        approvalRef: "user:approved:partial",
        semanticIntentContractRef: "semantic-intent:partial",
        affectedSurfaces: scopePaths,
      } as unknown as DigitalTwinChangeContract,
    });

    expect(partialInline.status).toBe("blocked_for_clarification");
    expect(partialInline.gate.semanticIntent.issues.map((issue) => issue.field)).toContain(
      "confirmedIntent",
    );
    expect(partialInline.gate.digitalTwin.issues.map((issue) => issue.field)).toContain(
      "changeBoundary",
    );

    const approved = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths,
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(),
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
    });
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(approved.status).toBe("pass");
    expect(approved.promptEnvelope?.state).toBe("digital_twin_approved");
    expect(approved.semanticConversationState?.lifecycle).toBe("dtc-approved");
    expect(approved.semanticConversationState?.contractFacing.dtcReady).toBe(true);
    expect(approved.semanticConversationState?.ontologyFacing.activatedSurfaceRefs).toContain(
      ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
    );
    expect(saved?.contractRefs.approvalRef).toBe("user:approved:wave3");

    const approvedEvent = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        entry.payload?.errorClass === "semantic_intent_gate_completed",
    );
    expect(approvedEvent?.payload?.promptId).toBe(envelope.promptId);
    expect(approvedEvent?.payload?.promptHash).toBe(envelope.promptHash);
    expect(approvedEvent?.payload?.runtime).toBe(envelope.runtime);
    expect(approvedEvent?.payload?.projectRoot).toBe(project);
    expect(approvedEvent?.payload?.contractRefs).toMatchObject({
      semanticIntentContractRef: approved.contractRefs?.semanticIntentContractRef,
      digitalTwinChangeContractRef: approved.contractRefs?.digitalTwinChangeContractRef,
      approvalRef: "user:approved:wave3",
    });
  });

  test("approved SIC/DTC diagnostics do not treat context or tools as router authority", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent:
        "Implement ontology-affecting prompt-front-door contracts with application state and tool context",
      scopePaths: [
        ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
        ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
      ],
      complexityHint: "multi-file",
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(undefined, {
        toolSurfaceReadiness:
          "ApplicationState, RetrievalContext, and tools are diagnostic inputs only.",
        ontologyDtcBuildReadiness: {
          objectTypeRefs: ["object-type:prompt-envelope"],
          linkTypeRefs: ["link-type:prompt-envelope-contract"],
          actionTypeRefs: ["action-type:approve-prompt-contract"],
          functionRefs: ["function:validate-prompt-contract"],
          applicationStateRefs: ["application-state:prompt-front-door-review"],
          retrievalContextRefs: ["retrieval-context:prompt-front-door-docs"],
          toolRefs: ["tool:pm-intent-router"],
          evaluationRefs: ["validation-pack:prompt-front-door"],
          readinessVerdict: "ready-for-dtc",
        },
      }),
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
    });

    const fields =
      result.ontologyDtcBuildReadinessGate?.issues.map((issue) => issue.field) ?? [];
    expect(result.status).toBe("pass");
    expect(result.allowsRouting).toBe(true);
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
    expect(result.ontologyDtcBuildReadinessGate?.checks["body-dereferenced"].valid).toBe(
      false,
    );
    expect(fields).toContain("workContract");
    expect(fields).toContain("routerBinding");
    expect(result.workflowContract?.mutationAuthorized).toBe(false);
    expect(result.workflowContract?.allowedNextActions).toContain(
      "attach-work-contract-and-router-binding",
    );
  });

  test("workflow-control-plane implementation requires FDE session provenance", async () => {
    const project = makeTmpProject();
    const rawIntent =
      "Implement Ontology Engineering WorkflowContract and TurnCardDecisionSpec enforcement";

    const blocked = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["bridge/handlers/pm-ontology-engineering-workflow.ts"],
      complexityHint: "cross-cutting",
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(),
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
    });

    expect(blocked.status).toBe("contract_required");
    expect(blocked.allowsRouting).toBe(false);
    expect(blocked.gate.reason).toContain("FDEOntologyEngineeringSession provenance");

    const allowed = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["bridge/handlers/pm-ontology-engineering-workflow.ts"],
      complexityHint: "cross-cutting",
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(),
      fdeOntologyEngineeringSessionRef: "fde-ontology-engineering://session/test",
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
    });

    expect(allowed.status).toBe("pass");
    expect(allowed.allowsRouting).toBe(true);
  });

  test("persists advanced SIC fill result into prompt-front-door contract record", async () => {
    const project = makeTmpProject();
    const rawIntent = "Fill SemanticIntentContract turn and persist it";
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["lib/semantic-intent/fill-sequence.ts"],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      fillPolicy: "default-8-turn", // W3d-2b: pin to legacy 8-turn (default flipped to nine-axis)
      turn: 1,
      turnUserInput: "lib/context-engineering/context-plan-builder.ts",
    });

    const semanticRecord = await store.readContractRecordByRef<SicWithFillFields>(
      result.contractRefs?.semanticIntentContractRef ?? "",
    );
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(result.fillResult?.contract.fillSequence?.length).toBe(1);
    expect(semanticRecord?.contract.fillSequence?.length).toBe(1);
    expect(semanticRecord?.contract.affectedSurfaces).toContain(
      "lib/context-engineering/context-plan-builder.ts",
    );
    expect(saved?.contractRefs.semanticIntentContractRef).toBe(
      result.contractRefs?.semanticIntentContractRef,
    );
  });

  test("persists advanced DTC fill result and holds envelope at DTC review before approval", async () => {
    const project = makeTmpProject();
    const rawIntent = "Fill DigitalTwinChangeContract turn and persist it";
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);
    const semanticApprovalRef = "user:approved:dtc-fill";
    const semanticApproved = transitionPromptEnvelope(
      transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
        semanticIntentContractRef: "semantic-intent:approved:dtc-fill",
      }),
      "semantic_intent_approved",
      {
        approvalRef: semanticApprovalRef,
        semanticIntentApprovalRef: semanticApprovalRef,
      },
    );
    await store.saveEnvelope(semanticApproved);

    const dtcDraft = approvedDigitalTwin("semantic-intent:approved:dtc-fill", {
      status: "draft",
      approvalRef: undefined,
      changeBoundary: "",
      risks: [],
    });

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["lib/context-engineering/dtc-from-context-plan.ts"],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      digitalTwinChangeContract: dtcDraft,
      fillPolicy: "dtc-turn-fill",
      turn: 6,
      turnUserInput: "Review DATA, LOGIC, ACTION before mutation approval.",
    });

    const digitalTwinRecord = await store.readContractRecordByRef(
      result.contractRefs?.digitalTwinChangeContractRef ?? "",
    );
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(result.dtcFillResult?.fillComplete).toBe(true);
    expect(result.dtcFillResult?.contract.verdict).toBe("dtc-filled");
    expect((digitalTwinRecord?.contract as { verdict?: string }).verdict).toBe("dtc-filled");
    expect(saved?.state).toBe("digital_twin_user_review");
    expect(saved?.contractRefs.digitalTwinChangeContractRef).toBe(
      result.contractRefs?.digitalTwinChangeContractRef,
    );
  });

  test("context-engineering-to-sic policy advances SIC readiness turns", async () => {
    const project = makeTmpProject();
    const rawIntent = "Fill Context Engineering before SemanticIntentContract approval";
    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["lib/semantic-intent/context-engineering-sic-fill-sequence.ts"],
      complexityHint: "multi-file",
      fillPolicy: "context-engineering-to-sic",
      turn: 1,
      turnUserInput: "EvidenceSource:palantir-official, .claude/plugins/palantir-mini",
    });

    const contract = result.fillResult?.contract as {
      fillPolicy?: string;
      contextEngineeringReadiness?: { dataEvidenceRefs?: readonly string[] };
    } | undefined;

    expect(result.fillResult?.appliedTurn).toBe(1);
    expect(result.fillResult?.fillComplete).toBe(false);
    expect(result.fillResult?.nextQuestion).toContain("T2 LOGIC");
    expect(contract?.fillPolicy).toBe("context-engineering-to-sic");
    expect(contract?.contextEngineeringReadiness?.dataEvidenceRefs).toContain(
      "EvidenceSource:palantir-official",
    );
  });

  test("ontology-dtc-build policy advances DTC ontology readiness turns", async () => {
    const project = makeTmpProject();
    const rawIntent = "Fill Ontology build contract before DigitalTwinChangeContract approval";
    const dtcDraft = approvedDigitalTwin("semantic-intent:approved:ontology-dtc-build", {
      status: "draft",
      approvalRef: undefined,
      touchedOntologyRefs: [],
      requiredEvaluationRefs: [],
      risks: [],
    });

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["lib/semantic-intent/ontology-dtc-build-sequence.ts"],
      complexityHint: "multi-file",
      digitalTwinChangeContract: dtcDraft,
      fillPolicy: "ontology-dtc-build",
      turn: 0,
      turnUserInput: "ObjectType:PluginCapability,ObjectType:WorkflowContract",
    });

    const contract = result.dtcFillResult?.contract as {
      fillPolicy?: string;
      ontologyDtcBuildReadiness?: { objectTypeRefs?: readonly string[] };
    } | undefined;

    expect(result.dtcFillResult?.policy).toBe("ontology-dtc-build");
    expect(result.dtcFillResult?.appliedTurn).toBe(0);
    expect(result.dtcFillResult?.fillComplete).toBe(false);
    expect(result.dtcFillResult?.nextQuestion).toContain("LinkType");
    expect(contract?.fillPolicy).toBe("ontology-dtc-build");
    expect(contract?.ontologyDtcBuildReadiness?.objectTypeRefs).toContain("PluginCapability");
  });

  test("ontology-dtc-build pre-seeds T0 from the approved SIC typed refs when userInput is empty (Slice E / G10)", async () => {
    const project = makeTmpProject();
    const rawIntent = "Pre-seed the DTC build from the approved SIC's ObjectType refs";
    const dtcDraft = approvedDigitalTwin("semantic-intent:approved:ontology-dtc-build", {
      status: "draft",
      approvalRef: undefined,
      touchedOntologyRefs: [],
      requiredEvaluationRefs: [],
      risks: [],
    });
    const sic = approvedSemantic({
      contractId: "semantic-intent:approved:ontology-dtc-build",
      approvedObjectTypeRefs: [
        { kind: "ObjectType", rid: "ri.ontology.main.object-type.invoice", confidence: "exact" },
        { kind: "ObjectType", rid: "ri.ontology.main.object-type.customer", confidence: "exact" },
      ],
    });

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: ["lib/semantic-intent/ontology-dtc-build-sequence.ts"],
      complexityHint: "multi-file",
      semanticIntentContract: sic,
      digitalTwinChangeContract: dtcDraft,
      fillPolicy: "ontology-dtc-build",
      turn: 0,
      turnUserInput: "",
    });

    const contract = result.dtcFillResult?.contract as {
      ontologyDtcBuildReadiness?: { objectTypeRefs?: readonly string[] };
    } | undefined;

    expect(result.dtcFillResult?.appliedTurn).toBe(0);
    // The user confirmed by sending nothing → the proposal carries the SIC ObjectType
    // refs (the gate derived sicTypedRefs from the approved SIC and threaded them in).
    const objectTypeRefs = contract?.ontologyDtcBuildReadiness?.objectTypeRefs ?? [];
    expect(objectTypeRefs).toContain("ri.ontology.main.object-type.invoice");
    expect(objectTypeRefs).toContain("ri.ontology.main.object-type.customer");
  });

  test("approved prompt envelope records separate structured semantic and digital twin approval refs", async () => {
    const project = makeTmpProject();
    const rawIntent =
      "Implement structured ApprovalRef provenance in the SemanticIntentContract and DigitalTwinChangeContract ontology gate";
    const scopePaths = [
      ".claude/plugins/palantir-mini/lib/lead-intent/contracts.ts",
      ".claude/plugins/palantir-mini/lib/prompt-front-door/envelope.ts",
    ];
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);
    const semanticApprovalRef = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the SemanticIntentContract meaning.",
      userAnswer: "Yes, approve the meaning only.",
      approvalSurface: "semantic-intent",
      approvedAt: "2026-05-10T04:01:00.000Z",
    });
    const digitalTwinApprovalRef = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the DigitalTwinChangeContract boundary.",
      userAnswer: "Approve the boundary; keep default advisory mode.",
      approvalSurface: "digital-twin-change",
      approvedAt: "2026-05-10T04:02:00.000Z",
    });

    const approved = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths,
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemantic({ approvalRef: semanticApprovalRef }),
      digitalTwinChangeContract: approvedDigitalTwin(undefined, {
        approvalRef: digitalTwinApprovalRef,
      }),
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
    });
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(approved.status).toBe("pass");
    expect(saved?.contractRefs.approvalRef).toEqual(digitalTwinApprovalRef);
    expect(saved?.contractRefs.semanticIntentApprovalRef).toEqual(semanticApprovalRef);
    expect(saved?.contractRefs.digitalTwinApprovalRef).toEqual(digitalTwinApprovalRef);

    const approvedEvent = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        entry.payload?.errorClass === "semantic_intent_gate_completed",
    );
    expect(approvedEvent?.payload?.semanticIntentApprovalRef).toEqual(semanticApprovalRef);
    expect(approvedEvent?.payload?.digitalTwinApprovalRef).toEqual(digitalTwinApprovalRef);
  });

  test("stale promptHash fails prompt continuity and does not persist drafts", async () => {
    const project = makeTmpProject();
    const rawIntent = "Persist prompt-front-door continuity";
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: [".claude/plugins/palantir-mini/lib/prompt-front-door/store.ts"],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: "stale-hash",
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    });
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(result.status).toBe("blocked_for_clarification");
    expect(result.promptContinuity?.valid).toBe(false);
    expect(saved?.state).toBe("captured");
  });

  test("draftMode never preserves legacy pass-through without prompt persistence", async () => {
    const project = makeTmpProject();
    const rawIntent = "Read-only prompt-front-door triage";
    const { store, envelope } = await createCapturedPrompt(project, rawIntent);

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths: [".claude/plugins/palantir-mini/lib/prompt-front-door/store.ts"],
      complexityHint: "cross-cutting",
      draftMode: "never",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    });
    const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

    expect(result.draftContracts).toBeUndefined();
    expect(result.contractRefs).toBeUndefined();
    expect(saved?.state).toBe("captured");
  });
});

describe("pm_semantic_intent_gate semantic consistency projection", () => {
  test("returns deterministic resolver evidence in conversation state", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Read-only semantic consistency projection before ontology promotion.",
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
    });

    expect(result.semanticConsistencyResult?.deterministic).toBe(true);
    expect(result.semanticConsistencyResult?.llmPromotionUsed).toBe(false);
    expect(result.semanticConversationState?.semanticConsistencyFacing?.resolverRunRef)
      .toBe(result.semanticConsistencyResult?.resolverRunId);
    expect(result.semanticConversationState?.semanticConsistencyFacing?.promotionReady)
      .toBe(true);

    const event = readEvents(project).find((entry) =>
      entry.payload?.semanticConsistencyResolverRunId === result.semanticConsistencyResult?.resolverRunId
    );
    expect(event?.payload?.semanticConsistencyConflictCount).toBe(0);
    expect(event?.payload?.semanticConsistencyPromotionReady).toBe(true);
  });

  test("blocks approved ontology-affecting contracts when deterministic resolver output is absent", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement ontology-affecting semantic consistency promotion.",
      scopePaths: ["ontology/object-types/customer.ts", "bridge/handlers/pm-semantic-intent-gate.ts"],
      complexityHint: "multi-file",
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(),
    });

    expect(result.status).toBe("blocked_for_clarification");
    expect(result.allowsRouting).toBe(false);
    expect(result.gate.semanticIntent.issues.map((issue) => issue.message)).toContain(
      "SEMANTIC_CONSISTENCY_RESULT_MISSING: ontology-affecting promotion requires deterministic SemanticConsistencyResolver output",
    );
    expect(result.promptEnvelope?.state).not.toBe("digital_twin_approved");
  });

  test("blocks approved ontology-affecting contracts when resolver conflicts remain open", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement ontology-affecting semantic consistency promotion.",
      scopePaths: ["ontology/object-types/customer.ts", "bridge/handlers/pm-semantic-intent-gate.ts"],
      complexityHint: "multi-file",
      semanticIntentContract: approvedSemantic({
        semanticConsistencyResultRef: resolveSemanticConsistency(overloadedCustomerFixture()).resolverRunId,
      }),
      digitalTwinChangeContract: approvedDigitalTwin(undefined, {
        semanticConsistencyRefs: [
          resolveSemanticConsistency(overloadedCustomerFixture()).resolverRunId,
        ],
      }),
      semanticConsistencyResolverInput: overloadedCustomerFixture(),
    });

    expect(result.status).toBe("blocked_for_clarification");
    expect(result.allowsRouting).toBe(false);
    expect(result.gate.semanticIntent.issues.map((issue) => issue.message).join("\n")).toContain(
      "SEMANTIC_CONSISTENCY_UNRESOLVED_BLOCKING_CONFLICT",
    );
    expect(result.semanticConsistencyResult?.unresolvedBlockingConflictRefs.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// fill-sequence unit tests
// ---------------------------------------------------------------------------
describe("lib/semantic-intent/fill-sequence", () => {
  test("EIGHT_TURN_FILL_SEQUENCE has exactly 8 entries with step 1-8", () => {
    expect(EIGHT_TURN_FILL_SEQUENCE.length).toBe(8);
    for (let i = 0; i < 8; i++) {
      expect(EIGHT_TURN_FILL_SEQUENCE[i]?.turnIndex).toBe(i);
      expect(EIGHT_TURN_FILL_SEQUENCE[i]?.step).toBe(i + 1);
      expect(typeof EIGHT_TURN_FILL_SEQUENCE[i]?.question).toBe("string");
    }
  });

  function makeMinimalSic(overrides: Partial<SicWithFillFields> = {}): SicWithFillFields {
    return {
      contractId: "sic-test-001",
      status: "draft",
      rawIntent: "Implement fill sequence for SemanticIntentContract",
      confirmedIntent: "Implement 8-turn fill sequence (PR 5.10) in pm-semantic-intent-gate.",
      approvedNouns: [],
      approvedVerbs: [],
      affectedSurfaces: [],
      nonGoals: [],
      downstreamAllowed: [],
      downstreamForbidden: [],
      clarificationQuestions: [],
      permissionsAndProposal: "",
      acceptedRisks: [],
      ...overrides,
    } as SicWithFillFields;
  }

  test("T0 with system source writes step 1 to fillSequence", () => {
    const sic = makeMinimalSic();
    const next = advanceFillSequence(sic, 0);
    expect(next.fillSequence?.length).toBe(1);
    expect(next.fillSequence?.[0]?.step).toBe(1);
    expect(next.fillSequence?.[0]?.source).toBe("system");
    expect(typeof next.fillSequence?.[0]?.filledAt).toBe("string");
    expect(next.fillSequence?.[0]?.answer).toBeUndefined();
  });

  test("T1 with user input writes step 2 and appends affectedSurfaces", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 1, "lib/semantic-intent/fill-sequence.ts, bridge/handlers/pm-semantic-intent-gate.ts");
    expect(next.fillSequence?.length).toBe(1);
    expect(next.fillSequence?.[0]?.step).toBe(2);
    expect(next.fillSequence?.[0]?.source).toBe("user");
    expect(next.affectedSurfaces).toContain("lib/semantic-intent/fill-sequence.ts");
    expect(next.affectedSurfaces).toContain("bridge/handlers/pm-semantic-intent-gate.ts");
  });

  test("T1 with agent auto-fill writes step 2 with source=agent", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 1, undefined, {
      affectedSurfaces: ["lib/semantic-intent/fill-sequence.ts"],
    });
    expect(next.fillSequence?.[0]?.source).toBe("agent");
    // agent auto-fill fields are applied via agentAutoFill spread
    expect(next.affectedSurfaces).toContain("lib/semantic-intent/fill-sequence.ts");
  });

  test("T3 with user input appends nonGoals", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 3, "Do not change schema primitives, Do not add new hooks");
    expect(next.nonGoals).toContain("Do not change schema primitives");
    expect(next.nonGoals).toContain("Do not add new hooks");
    expect(next.fillSequence?.[0]?.step).toBe(4);
    expect(next.fillSequence?.[0]?.source).toBe("user");
  });

  test("T4 with pipe-separated user input splits into downstreamAllowed and downstreamForbidden", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 4, "persist approved contracts | change enforcement gates to blocking");
    expect(next.downstreamAllowed).toContain("persist approved contracts");
    expect(next.downstreamForbidden).toContain("change enforcement gates to blocking");
  });

  test("T5 with user input sets seedRid", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 5, "seed:ontology-context:sic-pr510");
    expect(next.seedRid).toBe("seed:ontology-context:sic-pr510");
  });

  test("T6 with user input sets gradeRubricRid", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 6, "rubric:sic-fill-quality:v1");
    expect(next.gradeRubricRid).toBe("rubric:sic-fill-quality:v1");
  });

  test("T7 sets verdict=filled regardless of completeness", () => {
    const sic = makeMinimalSic({ fillSequence: [] });
    const next = advanceFillSequence(sic, 7);
    expect(next.verdict).toBe("filled");
    expect(next.fillSequence?.[0]?.step).toBe(8);
  });

  test("isFillComplete returns false when fillSequence has fewer than 8 steps", () => {
    const sic = makeMinimalSic({
      fillSequence: [{ step: 1, filledAt: new Date().toISOString(), source: "system" }],
      approvedNouns: ["SicFillStep"],
      approvedVerbs: ["advanceFillSequence"],
      affectedSurfaces: ["lib/semantic-intent/fill-sequence.ts"],
    });
    expect(isFillComplete(sic)).toBe(false);
  });

  test("isFillComplete returns true with 8 steps and required fields populated", () => {
    let sic: SicWithFillFields = makeMinimalSic({
      approvedNouns: ["SicFillStep"],
      approvedVerbs: ["advanceFillSequence"],
      affectedSurfaces: ["lib/semantic-intent/fill-sequence.ts"],
    });
    // Walk all 8 turns
    for (let i = 0; i < 8; i++) {
      sic = advanceFillSequence(sic, i);
    }
    expect(sic.fillSequence?.length).toBe(8);
    expect(isFillComplete(sic)).toBe(true);
  });

  test("advanceFillSequence throws on out-of-range turnIndex", () => {
    const sic = makeMinimalSic();
    expect(() => advanceFillSequence(sic, -1)).toThrow(RangeError);
    expect(() => advanceFillSequence(sic, 8)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// 8-turn fill sequence integration tests (via semanticIntentGate handler)
// ---------------------------------------------------------------------------
describe("pm_semantic_intent_gate — 8-turn fill sequence integration", () => {
  const tmpDirs2: string[] = [];

  function makeTmpProject2(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sig-fill-"));
    tmpDirs2.push(dir);
    fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs2.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function readEvents2(project: string) {
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    if (!fs.existsSync(eventsPath)) return [];
    return fs
      .readFileSync(eventsPath, "utf8")
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
  }

  test("T0 invocation produces fillResult with step 1, source=system, no nextQuestion absence after T7", async () => {
    const project = makeTmpProject2();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement 8-turn fill for SIC",
      scopePaths: ["lib/semantic-intent/fill-sequence.ts"],
      complexityHint: "multi-file",
      turn: 0,
    });
    expect(result.fillResult).toBeDefined();
    expect(result.fillResult?.appliedTurn).toBe(0);
    expect(result.fillResult?.contract.fillSequence?.length).toBe(1);
    expect(result.fillResult?.contract.fillSequence?.[0]?.step).toBe(1);
    expect(result.fillResult?.contract.fillSequence?.[0]?.source).toBe("system");
    expect(result.fillResult?.fillComplete).toBe(false);
    expect(typeof result.fillResult?.nextQuestion).toBe("string");
  });

  test("T1 with user input produces fillResult with source=user and affectedSurfaces appended", async () => {
    const project = makeTmpProject2();
    // First get a draft contract via T0
    const t0 = await semanticIntentGate({
      project,
      rawIntent: "Implement 8-turn fill for SIC",
      scopePaths: ["lib/semantic-intent/fill-sequence.ts"],
      complexityHint: "multi-file",
      fillPolicy: "default-8-turn", // W3d-2b: pin to legacy 8-turn (default flipped to nine-axis)
      turn: 0,
    });
    const contractAfterT0 = t0.fillResult?.contract ?? t0.draftContracts?.semanticIntent;

    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement 8-turn fill for SIC",
      scopePaths: ["lib/semantic-intent/fill-sequence.ts"],
      complexityHint: "multi-file",
      fillPolicy: "default-8-turn", // W3d-2b: this test guards the legacy T1 affectedSurfaces-append mechanic
      turn: 1,
      turnUserInput: "lib/semantic-intent/fill-sequence.ts",
      semanticIntentContract: contractAfterT0,
    });
    expect(result.fillResult?.appliedTurn).toBe(1);
    // T1 step is appended to the end; its index depends on how many steps came before
    const t1Step = result.fillResult?.contract.fillSequence?.find((s) => s.step === 2);
    expect(t1Step?.source).toBe("user");
    expect(result.fillResult?.contract.affectedSurfaces).toContain(
      "lib/semantic-intent/fill-sequence.ts",
    );
  });

  test("T7 sets verdict=filled and emits semantic_intent_contract_finalized event", async () => {
    const project = makeTmpProject2();
    const baseSic: SicWithFillFields = {
      contractId: "sic-t7-test",
      status: "draft",
      rawIntent: "Implement fill sequence",
      confirmedIntent: "Implement 8-turn fill sequence PR 5.10.",
      approvedNouns: ["SicFillStep"],
      approvedVerbs: ["advanceFillSequence"],
      affectedSurfaces: ["lib/semantic-intent/fill-sequence.ts"],
      nonGoals: ["Do not change schema"],
      downstreamAllowed: ["persist contracts"],
      downstreamForbidden: ["switch to blocking"],
      clarificationQuestions: [],
      permissionsAndProposal: "",
      acceptedRisks: [],
      fillSequence: [
        { step: 1, filledAt: new Date().toISOString(), source: "system" },
        { step: 2, filledAt: new Date().toISOString(), source: "user" },
        { step: 3, filledAt: new Date().toISOString(), source: "user" },
        { step: 4, filledAt: new Date().toISOString(), source: "user" },
        { step: 5, filledAt: new Date().toISOString(), source: "user" },
        { step: 6, filledAt: new Date().toISOString(), source: "user" },
        { step: 7, filledAt: new Date().toISOString(), source: "user" },
      ],
    };

    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement fill sequence",
      complexityHint: "multi-file",
      fillPolicy: "default-8-turn", // W3d-2b: pin to legacy 8-turn (default flipped to nine-axis)
      turn: 7,
      semanticIntentContract: baseSic as unknown as SemanticIntentContract,
    });

    expect(result.fillResult?.appliedTurn).toBe(7);
    expect(result.fillResult?.contract.verdict).toBe("filled");
    expect(result.fillResult?.contract.fillSequence?.length).toBe(8);
    expect(result.fillResult?.fillComplete).toBe(true);
    expect(result.fillResult?.nextQuestion).toBeUndefined();

    // Check that semantic_intent_contract_finalized event was emitted
    // (as validation_phase_completed with errorClass="semantic_intent_contract_finalized")
    const events = readEvents2(project);
    const finalizedEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload?.errorClass === "semantic_intent_contract_finalized",
    );
    expect(finalizedEvent).toBeDefined();
    expect(finalizedEvent?.payload?.verdict).toBe("filled");
    expect(finalizedEvent?.payload?.contractId).toBe("sic-t7-test");
  });

  test("T7 with missing required fields emits sic_fill_incomplete advisory", async () => {
    const project = makeTmpProject2();
    const incompleteSic: SicWithFillFields = {
      contractId: "sic-incomplete-test",
      status: "draft",
      rawIntent: "Implement fill sequence",
      confirmedIntent: "", // missing
      approvedNouns: [], // missing
      approvedVerbs: [], // missing
      affectedSurfaces: [], // missing
      nonGoals: [],
      downstreamAllowed: [],
      downstreamForbidden: [],
      clarificationQuestions: [],
      permissionsAndProposal: "",
      acceptedRisks: [],
      fillSequence: [],
    };

    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement fill sequence",
      complexityHint: "multi-file",
      fillPolicy: "default-8-turn", // W3d-2b: pin to legacy 8-turn (default flipped to nine-axis)
      turn: 7,
      semanticIntentContract: incompleteSic as unknown as SemanticIntentContract,
    });

    expect(result.fillResult?.appliedTurn).toBe(7);
    expect(result.fillResult?.contract.verdict).toBe("filled");
    expect(result.fillResult?.fillComplete).toBe(false);
    expect(result.fillResult?.fillIncomplete).toContain("sic_fill_incomplete");

    // Check that sic_fill_incomplete event was emitted (advisory)
    const events = readEvents2(project);
    const incompleteEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload?.errorClass === "sic_fill_incomplete",
    );
    expect(incompleteEvent).toBeDefined();
    expect(incompleteEvent?.payload?.advisory).toBe(true);
  });

  test("backward compat: no turn arg does not produce fillResult", async () => {
    const project = makeTmpProject2();
    const result = await semanticIntentGate({
      project,
      rawIntent: "Implement some ontology work",
      scopePaths: ["ontology/data/model.ts"],
      complexityHint: "multi-file",
    });
    expect(result.fillResult).toBeUndefined();
    // Existing behavior is unchanged
    expect(result.status).toBeDefined();
    expect(result.gate).toBeDefined();
  });
});
