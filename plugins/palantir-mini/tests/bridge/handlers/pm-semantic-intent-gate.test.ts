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
import { createSemanticClarificationQuestions } from "../../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
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
import { registrySnapshot } from "../../../lib/semantic-consistency/registry";

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

// Build a project whose governed snapshot registers exactly `rids` (mirrors the
// register seam's edit_committed event). Lead-verified to fold into
// registeredPrimitives so deriveRegisteredOntologyRids returns these rids.
function makeTmpProjectRegistering(rids: string[]): string {
  const project = makeTmpProject();
  const sessionDir = path.join(project, ".palantir-mini", "session");
  const event = JSON.stringify({
    eventId: "evt-rebind-1",
    sequence: 1,
    type: "edit_committed",
    when: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    atopWhich: { commitSha: "abc" },
    throughWhich: { sessionId: "s", toolName: "t", cwd: "c" },
    byWhom: { agentName: "t", identity: "claude-code" },
    decision: {
      atopWhich: { commitSha: "abc" },
      throughWhich: { surface: "t", tool: "t" },
      byWhom: { agent: "t", identity: "claude-code" },
      withWhat: { reasoning: "register fixture" },
    },
    payload: {
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      appliedEdits: rids.map((rid) => ({
        kind: "object",
        rid,
        properties: { primitiveKind: "ObjectType", plainName: rid },
      })),
      submissionCriteriaPassed: [],
    },
  });
  fs.writeFileSync(path.join(sessionDir, "events.jsonl"), event + "\n");
  return project;
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
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
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
      // P3 — this test deep-reads semanticConversationState; request the full-inline view.
      responseView: "readiness",
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
    // P4 — turnCards are now id-refs, so the id-equality above no longer guards the
    // decisionSpec BODY. Assert body-equality across runtimes on the canonical inline home
    // (turnCardDecisionQueue) so a per-runtime spec divergence is still caught.
    expect(codexResult.turnCardDecisionQueue?.map((e) => e.decisionSpec)).toEqual(
      claudeResult.turnCardDecisionQueue?.map((e) => e.decisionSpec),
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
      // P3 — this test deep-reads semanticConversationState; full-inline view.
      responseView: "readiness",
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

  test("0-new-term re-bind advances the ENVELOPE to digital_twin_approved despite an empty resolver result (seam wiring)", async () => {
    // Empty deterministic resolver result — mappings/conflicts both 0. In the un-wired
    // advance seam this re-triggered SEMANTIC_CONSISTENCY_EMPTY_RESULT and the envelope
    // never reached digital_twin_approved. (Lead-verified empty input ⇒ deterministic,
    // mappings=0, conflicts=0.)
    const emptyResolverInput = {
      sourceTerms: [],
      registry: registrySnapshot({ sourceSystems: [], canonicalTerms: [] }),
    };
    const emptyResult = resolveSemanticConsistency(emptyResolverInput);
    expect(emptyResult.deterministic).toBe(true);
    expect(emptyResult.mappings.length).toBe(0);
    expect(emptyResult.conflicts.length).toBe(0);

    const semantic = approvedSemantic({ semanticConsistencyResultRef: emptyResult.resolverRunId });
    const digitalTwin = approvedDigitalTwin(undefined, {
      semanticConsistencyRefs: [emptyResult.resolverRunId],
    });
    const touchedRids = (digitalTwin.touchedOntologyRefs ?? []).map((r: { rid: string }) => r.rid);

    // Snapshot registers EVERY touched rid ⇒ structural 0-new-term re-bind.
    const project = makeTmpProjectRegistering(touchedRids);
    const { envelope } = await createCapturedPrompt(project, "Re-bind existing prompt-front-door primitives");

    const approved = await semanticIntentGate({
      project,
      rawIntent: "Re-bind existing prompt-front-door primitives",
      scopePaths: [
        "bridge/handlers/pm-semantic-intent-gate.ts",
        "ontology/changeContracts.ts",
      ],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      semanticConsistencyResolverInput: emptyResolverInput,
      responseView: "readiness",
    });

    // THE seam assertion: envelope advanced to digital_twin_approved.
    expect(approved.promptEnvelope?.state).toBe("digital_twin_approved");
  });

  test("7.22.2: a pure-provenance re-bind SIC (0-new-term, all touched rids registered) reaches digital_twin_approved — the gate precondition rebind_registered relies on", async () => {
    // The `rebind_registered` action (7.22.2) re-elevates ALREADY-registered rids only.
    // Its governed entry requires the prompt envelope to reach digital_twin_approved for a
    // 0-new-term re-bind SIC. This locks that the gate admits exactly such a SIC.
    const emptyResolverInput = {
      sourceTerms: [],
      registry: registrySnapshot({ sourceSystems: [], canonicalTerms: [] }),
    };
    const emptyResult = resolveSemanticConsistency(emptyResolverInput);
    expect(emptyResult.deterministic).toBe(true);
    expect(emptyResult.mappings.length).toBe(0);

    const semantic = approvedSemantic({ semanticConsistencyResultRef: emptyResult.resolverRunId });
    const digitalTwin = approvedDigitalTwin(undefined, {
      semanticConsistencyRefs: [emptyResult.resolverRunId],
    });
    const touchedRids = (digitalTwin.touchedOntologyRefs ?? []).map((r: { rid: string }) => r.rid);

    // Every touched rid is already-registered ⇒ a structural pure-provenance re-bind.
    const project = makeTmpProjectRegistering(touchedRids);
    const { envelope } = await createCapturedPrompt(project, "Re-bind (re-elevate) existing registered primitives at HEAD");

    const approved = await semanticIntentGate({
      project,
      rawIntent: "Re-bind (re-elevate) existing registered primitives at HEAD",
      scopePaths: [
        "bridge/handlers/pm-ontology-engineering-workflow.ts",
        "lib/event-log/read/fold-snapshot.ts",
      ],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      semanticConsistencyResolverInput: emptyResolverInput,
      responseView: "readiness",
    });

    expect(approved.promptEnvelope?.state).toBe("digital_twin_approved");
  });

  test("re-bind with a touched rid NOT registered ⇒ envelope does NOT advance (fail-closed legacy)", async () => {
    const emptyResolverInput = {
      sourceTerms: [],
      registry: registrySnapshot({ sourceSystems: [], canonicalTerms: [] }),
    };
    const emptyResult = resolveSemanticConsistency(emptyResolverInput);

    const semantic = approvedSemantic({ semanticConsistencyResultRef: emptyResult.resolverRunId });
    const digitalTwin = approvedDigitalTwin(undefined, {
      semanticConsistencyRefs: [emptyResult.resolverRunId],
    });
    const touchedRids = (digitalTwin.touchedOntologyRefs ?? []).map((r: { rid: string }) => r.rid);

    // Register only a STRICT SUBSET ⇒ at least one touched rid is NEW ⇒ NOT a rebind ⇒
    // empty-result finding fires again ⇒ legacy: no advance to digital_twin_approved.
    const project = makeTmpProjectRegistering(touchedRids.slice(0, touchedRids.length - 1));
    const { envelope } = await createCapturedPrompt(project, "Re-bind with an unregistered touched rid");

    const result = await semanticIntentGate({
      project,
      rawIntent: "Re-bind with an unregistered touched rid",
      scopePaths: [
        "bridge/handlers/pm-semantic-intent-gate.ts",
        "ontology/changeContracts.ts",
      ],
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      semanticConsistencyResolverInput: emptyResolverInput,
      responseView: "readiness",
    });

    expect(result.promptEnvelope?.state).not.toBe("digital_twin_approved");
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
      // P3 — this test deep-reads ontologyDtcBuildReadinessGate.issues/.checks; full-inline view.
      responseView: "readiness",
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

  test("verifiable user-approval envelope authorizes DTC-build dispatch (Improvement #3)", async () => {
    const project = makeTmpProject();
    // The captured prompt excerpt must itself express the approval (verb +
    // DTC-build surface marker, no negation) — the verifier re-checks the
    // hook-captured excerpt, never a model-supplied blob.
    const rawIntent =
      "Please approve the DTC build for the prompt-front-door ontology digital twin.";
    const scopePaths = [
      "bridge/handlers/pm-semantic-intent-gate.ts",
      "bridge/handlers/pm-intent-router.ts",
    ];
    const { envelope } = await createCapturedPrompt(project, rawIntent);
    // A structured approval ref bound to the REAL captured promptId+promptHash,
    // approvalSurface "digital-twin-change".
    const dtcBuildApprovalRef = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the DTC build dispatch.",
      userAnswer: "approve the DTC build",
      approvalSurface: "digital-twin-change",
      approvedAt: "2026-05-10T04:01:00.000Z",
    });

    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths,
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemantic({ approvalRef: dtcBuildApprovalRef }),
      digitalTwinChangeContract: approvedDigitalTwin(undefined, {
        approvalRef: dtcBuildApprovalRef,
      }),
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
      // The new fields carrying the envelope pointer (verified, never trusted).
      userApprovalPromptId: envelope.promptId,
      userApprovalPromptHash: envelope.promptHash,
      userApprovalQuote: "approve the DTC build",
      // P3 — this test deep-reads ontologyDtcBuildReadinessGate.checks; full-inline view.
      responseView: "readiness",
    });

    expect(result.status).toBe("pass");
    expect(result.allowsRouting).toBe(true);
    expect(result.promptEnvelope?.state).toBe("digital_twin_approved");
    // The verified envelope stands in for the absent WorkContract + RouterBinding:
    // the OntologyDtcBuildReadinessGate flips to ready-for-router (inverse of the
    // ":766" case where the same SIC+DTC without the envelope stays blocked).
    expect(result.ontologyDtcBuildReadinessGate?.status).toBe("ready-for-router");
    expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(true);
    expect(result.ontologyDtcBuildReadinessGate?.userApprovalAuthorized).toBe(true);
    expect(result.ontologyDtcBuildReadinessGate?.checks["body-dereferenced"].valid).toBe(true);
    expect(result.ontologyDtcBuildReadinessGate?.checks["work-contract-valid"].valid).toBe(true);
    expect(result.ontologyDtcBuildReadinessGate?.checks["router-binding-valid"].valid).toBe(true);

    // The grant emits a 5-dim audit event attributed to the user.
    const grantEvent = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        entry.payload?.errorClass === "dtc_build_approval_granted",
    );
    expect(grantEvent).toBeDefined();
    expect(grantEvent?.payload?.passed).toBe(true);
    expect(grantEvent?.payload?.approvalSurface).toBe("digital-twin-change");
    expect(grantEvent?.payload?.projectRoot).toBe(project);
    expect((grantEvent as { byWhom?: { identity?: string } } | undefined)?.byWhom?.identity).toBe(
      "user",
    );
  });

  test("DTC-build approval envelope stays fail-closed: missing / spoofed / governance-incomplete (Improvement #3)", async () => {
    const rawIntent =
      "Please approve the DTC build for the prompt-front-door ontology digital twin.";
    const scopePaths = [
      "bridge/handlers/pm-semantic-intent-gate.ts",
      "bridge/handlers/pm-intent-router.ts",
    ];

    // (a) MISSING — no envelope inputs supplied: byte-identical legacy behavior,
    //     readiness gate stays blocked, NO approval audit event is emitted.
    {
      const project = makeTmpProject();
      const { envelope } = await createCapturedPrompt(project, rawIntent);
      const result = await semanticIntentGate({
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
        // P3 — this block deep-reads ontologyDtcBuildReadinessGate.status; full-inline view.
        responseView: "readiness",
      });

      expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
      expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(false);
      expect(result.ontologyDtcBuildReadinessGate?.userApprovalAuthorized).toBe(false);
      const approvalEvent = readEvents(project).find(
        (entry) =>
          entry.type === "validation_phase_completed" &&
          (entry.payload?.errorClass === "dtc_build_approval_granted" ||
            entry.payload?.errorClass === "dtc_build_approval_denied"),
      );
      expect(approvalEvent).toBeUndefined();
    }

    // (b) SPOOFED / HASH-MISMATCH — the supplied approval promptHash does not match
    //     the captured envelope: the verifier denies, the readiness gate stays
    //     blocked, and a denied audit event is recorded with the mismatch reason.
    {
      const project = makeTmpProject();
      const { envelope } = await createCapturedPrompt(project, rawIntent);
      const dtcBuildApprovalRef = createUserApprovalRef({
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        userVisibleSummary: "Approve the DTC build dispatch.",
        userAnswer: "approve the DTC build",
        approvalSurface: "digital-twin-change",
        approvedAt: "2026-05-10T04:01:00.000Z",
      });
      const result = await semanticIntentGate({
        project,
        rawIntent,
        scopePaths,
        complexityHint: "multi-file",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        semanticIntentContract: approvedSemantic({ approvalRef: dtcBuildApprovalRef }),
        digitalTwinChangeContract: approvedDigitalTwin(undefined, {
          approvalRef: dtcBuildApprovalRef,
        }),
        semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: "stale-hash-does-not-match-captured-envelope",
        userApprovalQuote: "approve the DTC build",
        // P3 — this block deep-reads ontologyDtcBuildReadinessGate.status; full-inline view.
        responseView: "readiness",
      });

      expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
      expect(result.ontologyDtcBuildReadinessGate?.userApprovalAuthorized).toBe(false);
      const deniedEvent = readEvents(project).find(
        (entry) =>
          entry.type === "validation_phase_completed" &&
          entry.payload?.errorClass === "dtc_build_approval_denied",
      );
      expect(deniedEvent).toBeDefined();
      expect(deniedEvent?.payload?.passed).toBe(false);
      expect(String(deniedEvent?.payload?.reason)).toContain("promptHash");
    }

    // (b2) STALE-HASH on the continuity field itself — the main gate continuity
    //      check fails and the prompt is not promoted (the spoof negative the
    //      D-tests plan calls out at gate.test.ts:1098 shape).
    {
      const project = makeTmpProject();
      const { store, envelope } = await createCapturedPrompt(project, rawIntent);
      const result = await semanticIntentGate({
        project,
        rawIntent,
        scopePaths,
        complexityHint: "multi-file",
        promptId: envelope.promptId,
        promptHash: "stale-hash",
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        semanticIntentContract: approvedSemantic(),
        digitalTwinChangeContract: approvedDigitalTwin(),
        semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: "stale-hash",
        userApprovalQuote: "approve the DTC build",
      });
      const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);

      expect(result.promptContinuity?.valid).toBe(false);
      expect(result.status).toBe("blocked_for_clarification");
      expect(result.promptEnvelope?.state).not.toBe("digital_twin_approved");
      expect(saved?.state).toBe("captured");
    }

    // (c) MALFORMED approval ref — a structured ref missing a required field
    //     (userVisibleSummaryHash) on the CONTRACT approvalRef is rejected by the
    //     gate's own approval-ref validator; the contracts stay unapproved.
    {
      const project = makeTmpProject();
      const { envelope } = await createCapturedPrompt(project, rawIntent);
      const goodRef = createUserApprovalRef({
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        userVisibleSummary: "Approve the DTC build dispatch.",
        userAnswer: "approve the DTC build",
        approvalSurface: "digital-twin-change",
        approvedAt: "2026-05-10T04:01:00.000Z",
      });
      // Drop a required field to forge a malformed structured ref.
      const { userVisibleSummaryHash: _dropped, ...malformedRef } = goodRef;
      const result = await semanticIntentGate({
        project,
        rawIntent,
        scopePaths,
        complexityHint: "multi-file",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        semanticIntentContract: approvedSemantic({
          approvalRef: malformedRef as unknown as typeof goodRef,
        }),
        digitalTwinChangeContract: approvedDigitalTwin(undefined, {
          approvalRef: malformedRef as unknown as typeof goodRef,
        }),
        semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
        userApprovalQuote: "approve the DTC build",
        // P3 — this block deep-reads ontologyDtcBuildReadinessGate.checks; full-inline view.
        responseView: "readiness",
      });

      // A malformed structured approvalRef (missing userVisibleSummaryHash) is
      // rejected by the main contract validation: the gate blocks, the prompt is
      // NOT promoted, and the readiness gate's body-validated check fails. The
      // verified envelope can stand in for WorkContract/RouterBinding, but it
      // NEVER masks an invalid contract approvalRef body.
      expect(result.status).toBe("blocked_for_clarification");
      expect(result.allowsRouting).toBe(false);
      expect(result.promptEnvelope?.state).not.toBe("digital_twin_approved");
      expect(result.gate.semanticIntent.issues.map((issue) => issue.field)).toContain(
        "approvalRef.userVisibleSummaryHash",
      );
      expect(result.gate.digitalTwin.issues.map((issue) => issue.field)).toContain(
        "approvalRef.userVisibleSummaryHash",
      );
      expect(result.ontologyDtcBuildReadinessGate?.checks["body-validated"].valid).toBe(false);
      expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(false);
    }

    // (d) GOVERNANCE-INCOMPLETE REGRESSION — a verified envelope does NOT bypass
    //     body-validated: a DTC missing eval/branch/permission evidence still
    //     fails. The envelope only substitutes for WorkContract/RouterBinding.
    {
      const project = makeTmpProject();
      const { envelope } = await createCapturedPrompt(project, rawIntent);
      const dtcBuildApprovalRef = createUserApprovalRef({
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        userVisibleSummary: "Approve the DTC build dispatch.",
        userAnswer: "approve the DTC build",
        approvalSurface: "digital-twin-change",
        approvedAt: "2026-05-10T04:01:00.000Z",
      });
      const result = await semanticIntentGate({
        project,
        rawIntent,
        scopePaths,
        complexityHint: "multi-file",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        semanticIntentContract: approvedSemantic({ approvalRef: dtcBuildApprovalRef }),
        digitalTwinChangeContract: approvedDigitalTwin(undefined, {
          approvalRef: dtcBuildApprovalRef,
          requiredEvaluationRefs: [],
          requiredBranchPolicyRef: undefined,
          requiredPermissionPolicyRef: undefined,
        }),
        semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
        userApprovalQuote: "approve the DTC build",
        // P3 — this block deep-reads ontologyDtcBuildReadinessGate.checks/.issues; full-inline view.
        responseView: "readiness",
      });

      // The envelope WAS authorized (granted), but governance evidence is still
      // mandatory: body-validated fails and the gate stays blocked — no promotion.
      expect(result.ontologyDtcBuildReadinessGate?.status).toBe("blocked");
      expect(result.ontologyDtcBuildReadinessGate?.readyForRouter).toBe(false);
      expect(result.ontologyDtcBuildReadinessGate?.checks["body-validated"].valid).toBe(false);
      const govFields =
        result.ontologyDtcBuildReadinessGate?.issues.map((issue) => issue.field) ?? [];
      expect(govFields).toContain("digitalTwinChangeContract.requiredEvaluationRefs");
      expect(govFields).toContain("digitalTwinChangeContract.requiredBranchPolicyRef");
      expect(govFields).toContain("digitalTwinChangeContract.requiredPermissionPolicyRef");
    }
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
      // P3 — this test deep-reads semanticConversationState; full-inline view.
      responseView: "readiness",
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
    // QFS — the emitted fillResult.contract is now the union projection (decisionSpec may be a
    // by-id ref). On this unambiguous fixture clarificationQuestions is empty so the projection is
    // a no-op and the body is a full SIC; narrow it back to feed it as a contract input.
    const contractAfterT0 = (t0.fillResult?.contract ??
      t0.draftContracts?.semanticIntent) as SemanticIntentContract | undefined;

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
      schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
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
      schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
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

describe("response payload shaping (responseView / fullPath / dedup)", () => {
  const ambiguousIntent =
    "Implement Scene3D ontology, geometry3D, and renderer support";
  const ambiguousScope = [
    "ontology/data/visual3D.ts",
    "ontology/changeContracts.ts",
    "src/lib/jsxGraph3D/scene3DCompiler.ts",
  ];

  // Drive an APPROVED DTC-build flow (mirrors the ":1105" approved fixtures) so the result
  // carries a DEFINED `ontologyDtcBuildReadinessGate` with full per-check bodies — the
  // heaviest body P1 relocates. The earlier criteria use the ambiguous mid-fill flow, which
  // yields NO readiness gate, so they cannot exercise the readiness-gate relocation.
  async function runApprovedReadiness(responseView: "turn" | "readiness") {
    const project = makeTmpProject();
    const rawIntent =
      "Please approve the DTC build for the prompt-front-door ontology digital twin.";
    const scopePaths = [
      "bridge/handlers/pm-semantic-intent-gate.ts",
      "bridge/handlers/pm-intent-router.ts",
    ];
    const { envelope } = await createCapturedPrompt(project, rawIntent);
    const approvalRef = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the DTC build dispatch.",
      userAnswer: "approve the DTC build",
      approvalSurface: "digital-twin-change",
      approvedAt: "2026-05-10T04:01:00.000Z",
    });
    const result = await semanticIntentGate({
      project,
      rawIntent,
      scopePaths,
      complexityHint: "multi-file",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      semanticIntentContract: approvedSemantic({ approvalRef }),
      digitalTwinChangeContract: approvedDigitalTwin(undefined, { approvalRef }),
      semanticConsistencyResolverInput: crmBillingSupportCustomerFixture(),
      userApprovalPromptId: envelope.promptId,
      userApprovalPromptHash: envelope.promptHash,
      userApprovalQuote: "approve the DTC build",
      responseView,
    });
    return result;
  }

  // Acceptance criterion 1 — mid-fill turn is slim in the default ('turn') view: the heavy
  // invariant bodies are relocated to overflow.fullPath and OMITTED inline.
  test("(1) turn view OMITS heavy bodies inline and carries overflow{fullPath,bytes,digest}", async () => {
    const project = makeTmpProject();
    const result = await semanticIntentGate({
      project,
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
      fillPolicy: "default-8-turn",
      turn: 0,
      // responseView defaults to "turn" — assert the default is the slim shape.
    });

    expect(result.semanticConversationState).toBeUndefined();
    expect(result.decisions).toBeUndefined();
    expect(result.overflow).toBeDefined();
    expect(typeof result.overflow?.fullPath).toBe("string");
    expect(result.overflow?.bytes).toBeGreaterThan(0);
    expect(result.overflow?.digest).toMatch(/^[0-9a-f]{16}$/);
    expect(result.overflow?.contains).toContain("semanticConversationState");
    // fillResult (the live per-turn delta) stays inline in turn view.
    expect(result.fillResult?.appliedTurn).toBe(0);
  });

  // Acceptance criterion 1 (readiness-gate relocation) — the omission assert above is
  // tautological on the ambiguous mid-fill flow (it yields NO readiness gate). Run it on a
  // fixture that produces a DEFINED gate so the inline OMISSION passes because relocation
  // WORKED, not because no gate exists.
  test("(1b) turn view OMITS a DEFINED ontologyDtcBuildReadinessGate inline (relocated)", async () => {
    const result = await runApprovedReadiness("turn");
    // The gate IS produced for this fixture (readiness view returns it inline — asserted in M3).
    expect(result.ontologyDtcBuildReadinessGate).toBeUndefined();
    expect(result.overflow).toBeDefined();
    expect(result.overflow?.contains).toContain("ontologyDtcBuildReadinessGate");
  });

  // Acceptance criterion 2 — turn-by-turn fill is byte-identical across views (the live
  // delta never relocates and never changes shape with the view).
  test("(2) fillResult is byte-identical across 'turn' and 'readiness' views", async () => {
    const projectTurn = makeTmpProject();
    const projectReadiness = makeTmpProject();
    const common = {
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting" as const,
      fillPolicy: "default-8-turn" as const,
      turn: 0,
    };
    const turnView = await semanticIntentGate({ project: projectTurn, ...common });
    const readinessView = await semanticIntentGate({
      project: projectReadiness,
      ...common,
      responseView: "readiness",
    });

    expect(turnView.fillResult?.appliedTurn).toBe(readinessView.fillResult?.appliedTurn);
    expect(turnView.fillResult?.fillComplete).toBe(readinessView.fillResult?.fillComplete);
    expect(turnView.fillResult?.nextQuestion ?? null).toBe(
      readinessView.fillResult?.nextQuestion ?? null,
    );
    // Byte-equivalent modulo wall-clock `filledAt` stamps (a clock artifact, not a view
    // artifact — the two gate calls run a few ms apart). QFS: after the decisionSpec dedup,
    // `clarificationQuestions[].decisionSpec` is a {decisionRef} (resolvable via decisions{}
    // inline in readiness / inside overflow.fullPath in turn) instead of an inline body; this
    // cross-view byte-identity still HOLDS because the ref-conversion is computed ONCE,
    // view-independently — so it doubles as the QFS view-symmetry regression guard.
    const stripFilledAt = (c: unknown) =>
      JSON.stringify(c).replace(/"filledAt":"[^"]*"/g, '"filledAt":"<ts>"');
    expect(stripFilledAt(turnView.fillResult?.contract)).toBe(
      stripFilledAt(readinessView.fillResult?.contract),
    );
    // QFS — draftContracts.semanticIntent also carries the same view-independent ref-conversion,
    // so it is byte-identical across views too (new cross-view invariant for the deduped home #3).
    expect(stripFilledAt(turnView.draftContracts?.semanticIntent)).toBe(
      stripFilledAt(readinessView.draftContracts?.semanticIntent),
    );
  });

  // Acceptance criterion 3 — the relocated bodies are fully reachable: in the overflow file
  // (turn view) AND inline (readiness view).
  test("(3) heavy bodies are reachable via overflow.fullPath AND inline in readiness view", async () => {
    const projectTurn = makeTmpProject();
    const turnResult = await semanticIntentGate({
      project: projectTurn,
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
    });
    expect(turnResult.overflow?.fullPath).toBeDefined();
    const fromFile = JSON.parse(
      fs.readFileSync(turnResult.overflow!.fullPath, "utf8"),
    ) as {
      semanticConversationState?: unknown;
      decisions?: Record<string, unknown>;
      ontologyDtcBuildReadinessGate?: unknown;
    };
    // semanticConversationState is built unconditionally; decisions map is always present.
    expect(fromFile.semanticConversationState).toBeDefined();
    expect(fromFile.decisions).toBeDefined();

    const readinessResult = await semanticIntentGate({
      project: makeTmpProject(),
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
      responseView: "readiness",
    });
    expect(readinessResult.overflow).toBeUndefined();
    expect(readinessResult.semanticConversationState).toBeDefined();
    expect(readinessResult.decisions).toBeDefined();
  });

  // Acceptance criterion 3 (readiness-gate body) — the ambiguous fixture above yields NO
  // readiness gate, so it cannot prove the HEAVIEST body P1 relocates (the 7-check `checks{}`
  // + per-check issues) actually survives in the overflow FILE. Drive an APPROVED flow that
  // DOES produce a defined gate and assert: (a) inline OMITTED in turn view, (b) full per-check
  // bodies present in the overflow file, and (c) full inline in readiness view.
  test("(3b) a DEFINED ontologyDtcBuildReadinessGate.checks survives in the overflow file", async () => {
    const turnResult = await runApprovedReadiness("turn");
    expect(turnResult.ontologyDtcBuildReadinessGate).toBeUndefined();
    expect(turnResult.overflow?.fullPath).toBeDefined();
    const fromFile = JSON.parse(
      fs.readFileSync(turnResult.overflow!.fullPath, "utf8"),
    ) as {
      ontologyDtcBuildReadinessGate?: {
        checks?: Record<string, { valid: boolean; issues: unknown[] }>;
      };
    };
    expect(fromFile.ontologyDtcBuildReadinessGate).toBeDefined();
    const checks = fromFile.ontologyDtcBuildReadinessGate?.checks;
    expect(checks).toBeDefined();
    // The full per-check bodies (with the per-check issues arrays) are present in the file.
    expect(checks?.["body-dereferenced"]?.valid).toBe(true);
    expect(checks?.["work-contract-valid"]?.valid).toBe(true);
    expect(checks?.["router-binding-valid"]?.valid).toBe(true);
    expect(Array.isArray(checks?.["body-dereferenced"]?.issues)).toBe(true);

    // Readiness view returns the same gate INLINE (not relocated).
    const readinessResult = await runApprovedReadiness("readiness");
    expect(readinessResult.overflow).toBeUndefined();
    expect(readinessResult.ontologyDtcBuildReadinessGate?.checks["body-dereferenced"].valid).toBe(
      true,
    );
  });

  // Acceptance criterion 4 — a decisionSpec body is NOT duplicated: turnCards are id-refs,
  // the queue keeps the single inline body, and the ref resolves to that body's decisionId.
  test("(4) workflowContract.turnCards are id-refs; the queue holds the single inline body", async () => {
    const result = await semanticIntentGate({
      project: makeTmpProject(),
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
    });
    const refs = result.workflowContract?.turnCards ?? [];
    expect(refs.length).toBeGreaterThan(0);
    // Every turnCard entry is a plain string id (NOT a full {plainKoreanSummary} body).
    for (const ref of refs) {
      expect(typeof ref).toBe("string");
    }
    expect(typeof result.workflowContract?.activeTurnCard).toBe("string");

    // The queue keeps the FULL body (single inline home); its decisionId matches a ref.
    const queue = result.turnCardDecisionQueue;
    expect(queue.length).toBeGreaterThan(0);
    const firstBody = queue[0]!.decisionSpec;
    expect(firstBody.plainKoreanSummary.length).toBeGreaterThan(0);
    expect(refs).toContain(firstBody.decisionId);

    // gate.questions[].decisionSpec is projected to a by-id ref (not the full body).
    const firstQuestion = result.gate.questions[0];
    expect(firstQuestion).toBeDefined();
    expect(firstQuestion?.decisionSpec).toEqual({
      decisionRef: (firstQuestion?.decisionSpec as { decisionRef: string }).decisionRef,
    });

    // The ref must RESOLVE to a real `decisions{}` key (not just be shape-valid). In turn view
    // `decisions` is in the overflow file; re-run in readiness view (decisions inline) and
    // assert the gate.questions ref dereferences to a real body in that map.
    const readinessResult = await semanticIntentGate({
      project: makeTmpProject(),
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
      responseView: "readiness",
    });
    const firstRef = (
      readinessResult.gate.questions[0]?.decisionSpec as { decisionRef: string }
    ).decisionRef;
    expect(Object.keys(readinessResult.decisions ?? {})).toContain(firstRef);
  });

  // QFS (6) — open-decision-inline: every OPEN decision body inline EXACTLY ONCE (the queue),
  // while the two deduped homes (fillResult.contract = home #2, draftContracts.semanticIntent =
  // home #3) carry {decisionRef} that resolve to a real decisions{} key. Proves the
  // single-inline-home invariant survives the dedup and no duplicate body is materialized at
  // homes #2/#3. The gate is driven with `turn:0` so `fillResult` is actually POPULATED — its
  // clarificationQuestions[].decisionSpec are the live home-#2 projection target (asserted below).
  test("(6) open decisions inline once in the queue; fill + draft homes are {decisionRef}s resolving in decisions{}", async () => {
    const readiness = await semanticIntentGate({
      project: makeTmpProject(),
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
      fillPolicy: "default-8-turn",
      turn: 0,
      responseView: "readiness",
    });

    const queue = readiness.turnCardDecisionQueue;
    expect(queue.length).toBeGreaterThan(0);
    const decisionsMap = readiness.decisions ?? {};

    // (a) every OPEN queue decision: body inline exactly once + a single matching decisions{} key.
    for (const entry of queue) {
      const id = entry.decisionSpec.decisionId;
      expect(entry.decisionSpec.plainKoreanSummary.length).toBeGreaterThan(0);
      // exactly ONE inline body for this id across the queue.
      const inlineBodyCount = queue.filter(
        (q) => q.decisionSpec.decisionId === id && "plainKoreanSummary" in q.decisionSpec,
      ).length;
      expect(inlineBodyCount).toBe(1);
      expect(Object.keys(decisionsMap)).toContain(id);
    }

    // (b) home #2 (fillResult.contract) carries {decisionRef}s — POSITIVELY asserted, not just
    //     claimed. `turn:0` above populated fillResult; its clarificationQuestions are the live
    //     home-#2 projection target. Each ref must resolve to a real decisions{} key.
    const fillQs = readiness.fillResult?.contract.clarificationQuestions ?? [];
    expect(fillQs.length).toBeGreaterThan(0);
    for (const q of fillQs) {
      expect(q.decisionSpec).toHaveProperty("decisionRef");
      const ref = (q.decisionSpec as { decisionRef: string }).decisionRef;
      expect(Object.keys(decisionsMap)).toContain(ref);
    }

    // (c) home #3 (draftContracts.semanticIntent) carries {decisionRef}s,
    //     and each ref resolves to a real decisions{} key (no dangle on the common path).
    const draftQs = readiness.draftContracts?.semanticIntent.clarificationQuestions ?? [];
    expect(draftQs.length).toBeGreaterThan(0);
    for (const q of draftQs) {
      expect(q.decisionSpec).toHaveProperty("decisionRef");
      const ref = (q.decisionSpec as { decisionRef: string }).decisionRef;
      expect(Object.keys(decisionsMap)).toContain(ref);
      // (d) the resolved body matches the queue's inline body (no divergence).
      const queueBody = queue.find((e) => e.decisionSpec.decisionId === ref)?.decisionSpec;
      if (queueBody) {
        expect(decisionsMap[ref]?.plainKoreanSummary).toBe(queueBody.plainKoreanSummary);
      }
    }
  });

  // QFS (6-fde) — the fde-ontology-build projection home (fdeFillResult.contract) is deduped the
  // SAME way: clarificationQuestions[].decisionSpec become {decisionRef}s that resolve in
  // decisions{}. The fde projection has its own emit-boundary branch in the handler, so it needs
  // its own positive guard (the SIC-path fillResult guard in (6) does not cover it).
  test("(6-fde) fde-ontology-build home (fdeFillResult.contract) is {decisionRef}s resolving in decisions{}", async () => {
    const readiness = await semanticIntentGate({
      project: makeTmpProject(),
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting",
      fillPolicy: "fde-ontology-build",
      turn: 0,
      responseView: "readiness",
    });

    // fde policy populates fdeFillResult (NOT fillResult); its clarificationQuestions are the
    // live fde projection target.
    const fdeQs = readiness.fdeFillResult?.contract.clarificationQuestions ?? [];
    expect(fdeQs.length).toBeGreaterThan(0);
    const decisionsMap = readiness.decisions ?? {};
    for (const q of fdeQs) {
      expect(q.decisionSpec).toHaveProperty("decisionRef");
      const ref = (q.decisionSpec as { decisionRef: string }).decisionRef;
      expect(Object.keys(decisionsMap)).toContain(ref);
    }
  });

  // QFS (7) — fail-open: a clarificationQuestion whose decisionId is ABSENT from decisions{}
  // keeps its FULL body inline (never emits a dangling ref). Mirrors the P1 FAIL-SAFE.
  test("(7) fail-open — an unresolved decisionId keeps the full decisionSpec body (no dangling ref)", async () => {
    // Build a real clarification question, then stamp it with an id that the unambiguous gate
    // below will NOT produce (so it is absent from decisions{}).
    const seed = createSemanticClarificationQuestions({
      intent: "seed",
      scopePaths: ["lib/x.ts"],
    });
    const seedQuestion = seed[0];
    expect(seedQuestion).toBeDefined();
    const unresolvedId = "fail-open:unresolved-decision-id";
    const customQuestion: SemanticIntentContract["clarificationQuestions"][number] = {
      ...seedQuestion!,
      questionId: unresolvedId,
      decisionSpec: { ...seedQuestion!.decisionSpec, decisionId: unresolvedId },
    };
    const callerSic = approvedSemantic({
      status: "draft",
      clarificationQuestions: [customQuestion],
    });

    const result = await semanticIntentGate({
      project: makeTmpProject(),
      // Unambiguous read-only-ish intent so the gate produces no matching questions for this id.
      rawIntent: "Persist prompt-front-door contracts",
      scopePaths: ["lib/prompt-front-door/store.ts"],
      complexityHint: "single-file",
      fillPolicy: "default-8-turn",
      turn: 0,
      semanticIntentContract: callerSic,
      responseView: "readiness",
    });

    const fillQ = result.fillResult?.contract.clarificationQuestions.find(
      (q) => (q.decisionSpec as { decisionId?: string }).decisionId === unresolvedId,
    );
    expect(fillQ).toBeDefined();
    // The id is NOT in decisions{} → fail-open keeps the FULL body (has plainKoreanSummary),
    // never a bare {decisionRef}.
    expect(Object.keys(result.decisions ?? {})).not.toContain(unresolvedId);
    expect(fillQ?.decisionSpec).not.toHaveProperty("decisionRef");
    expect((fillQ?.decisionSpec as { plainKoreanSummary?: string }).plainKoreanSummary?.length).toBeGreaterThan(0);
  });

  // QFS (8) — quality-bounded byte assert: the dedup REMOVED the duplicate decisionSpec bodies
  // (turn view drops vs readiness by ~the dedup amount) WITHOUT stripping live substance. NOT a
  // fixed ~3KB floor — the turn view stays substantial (queue body once + live fill delta).
  test("(8) dedup drops the duplicate bodies (turn < readiness) while keeping live substance", async () => {
    const common = {
      rawIntent: ambiguousIntent,
      scopePaths: ambiguousScope,
      complexityHint: "cross-cutting" as const,
    };
    const turnView = await semanticIntentGate({ project: makeTmpProject(), ...common });
    const readinessView = await semanticIntentGate({
      project: makeTmpProject(),
      ...common,
      responseView: "readiness",
    });

    // The deduped homes carry refs (not bodies) in BOTH views (view-symmetric projection).
    for (const q of turnView.draftContracts?.semanticIntent.clarificationQuestions ?? []) {
      expect(q.decisionSpec).toHaveProperty("decisionRef");
    }
    for (const q of readinessView.draftContracts?.semanticIntent.clarificationQuestions ?? []) {
      expect(q.decisionSpec).toHaveProperty("decisionRef");
    }

    // The single inline body home (queue) still carries the FULL body — live substance kept.
    const queueBodyMarkers = readinessView.turnCardDecisionQueue.filter(
      (e) => e.decisionSpec.plainKoreanSummary.length > 0,
    ).length;
    expect(queueBodyMarkers).toBeGreaterThan(0);

    // Real delta proof: the turn view is SMALLER than the bodies-inline readiness view — the
    // dedup + heavy-body relocation actually REMOVED bytes (refs replace inline decisionSpec
    // bodies; the heavy bundle is relocated to overflow.fullPath). A floor alone passes on the
    // pre-dedup base, so compare the two views directly.
    const turnBytes = JSON.stringify(turnView).length;
    const readinessBytes = JSON.stringify(readinessView).length;
    expect(turnBytes).toBeLessThan(readinessBytes);

    // Quality-bounded: the turn view stays substantial (NOT a tiny ~3KB floor) — the live fill
    // delta + verdict surfaces + the single queue body all remain inline.
    expect(turnBytes).toBeGreaterThan(8000);
  });

  // Acceptance criterion 5 — gate SEMANTICS are unchanged across views: the verdict scalars,
  // mutationAuthorized, envelope state, slim readiness summary, and emitted 5-dim events are
  // identical whether the caller asks for 'turn' or 'readiness'.
  test("(5) gate semantics (verdict, mutationAuthorized, events) are identical across views", async () => {
    const rawIntent = "Persist prompt-front-door contracts for the semantic gate";
    const scopePaths = [
      "bridge/handlers/pm-semantic-intent-gate.ts",
      "bridge/handlers/pm-intent-router.ts",
    ];

    async function runApproved(responseView: "turn" | "readiness") {
      const project = makeTmpProject();
      const { envelope } = await createCapturedPrompt(project, rawIntent);
      const result = await semanticIntentGate({
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
        responseView,
      });
      const completed = readEvents(project).find(
        (e) =>
          e.type === "validation_phase_completed" &&
          e.payload?.errorClass === "semantic_intent_gate_completed",
      );
      return { result, completed };
    }

    const turn = await runApproved("turn");
    const readiness = await runApproved("readiness");

    // Verdict scalars + authorization identical.
    expect(turn.result.status).toBe(readiness.result.status);
    expect(turn.result.allowsRouting).toBe(readiness.result.allowsRouting);
    expect(turn.result.workflowContract?.mutationAuthorized).toBe(
      readiness.result.workflowContract?.mutationAuthorized,
    );
    expect(turn.result.promptEnvelope?.state).toBe(readiness.result.promptEnvelope?.state);

    // The slim readiness summary stays inline in BOTH views (it is the verdict surface).
    expect(turn.result.workflowContract?.ontologyDtcBuildReadiness?.status).toBe(
      readiness.result.workflowContract?.ontologyDtcBuildReadiness?.status,
    );
    expect(turn.result.workflowContract?.ontologyDtcBuildReadiness?.readyForRouter).toBe(
      readiness.result.workflowContract?.ontologyDtcBuildReadiness?.readyForRouter,
    );

    // The emitted 5-dim completion event is identical (same decision, same passed verdict).
    expect(turn.completed).toBeDefined();
    expect(readiness.completed).toBeDefined();
    expect(turn.completed?.payload?.passed).toBe(readiness.completed?.payload?.passed);
    expect(turn.completed?.payload?.status).toBe(readiness.completed?.payload?.status);

    // Only the payload SHAPE differs: turn view relocated the heavy bodies; readiness inlined them.
    expect(turn.result.overflow).toBeDefined();
    expect(turn.result.ontologyDtcBuildReadinessGate).toBeUndefined();
    expect(readiness.result.overflow).toBeUndefined();
    expect(readiness.result.ontologyDtcBuildReadinessGate).toBeDefined();

    // Absolute base pin (not just cross-view equality): on a fully-approved fixture (user-approval
    // envelope flips readiness to ready-for-router with no open decisions) `mutationAuthorized` is
    // TRUE — so the cross-view equality above guards a real authorized verdict, not false===false.
    const approvedReadiness = await runApprovedReadiness("readiness");
    expect(approvedReadiness.workflowContract?.mutationAuthorized).toBe(true);
  });
});
