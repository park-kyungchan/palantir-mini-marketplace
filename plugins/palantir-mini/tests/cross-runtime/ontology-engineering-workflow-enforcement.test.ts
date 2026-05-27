import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { routeIntent } from "../../bridge/handlers/pm-intent-router";
import { semanticIntentGate } from "../../bridge/handlers/pm-semantic-intent-gate";
import { handleOntologyEngineeringWorkflow } from "../../bridge/handlers/pm-ontology-engineering-workflow";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import type { PromptRuntime } from "../../lib/prompt-front-door";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  type PromptEnvelope,
} from "../../lib/prompt-front-door";
import {
  createUniversalOntologyEntry,
} from "../../lib/ontology-entry/universal-entry";
import {
  writeUniversalOntologyEntry,
} from "../../lib/ontology-entry/entry-store";
import suiteDeclaration from "../../eval-suites/ontology-engineering-cross-runtime-enforcement.json";

const tmpDirs: string[] = [];
const WORKFLOW_INTENT =
  "Implement palantir-mini Ontology Engineering WorkflowContract TurnCardDecisionSpec UserDecisionRecord enforcement without runtime-native question UI.";
const WORKFLOW_SCOPE = [
  "bridge/handlers/pm-semantic-intent-gate.ts",
  "bridge/handlers/pm-intent-router.ts",
  "bridge/handlers/pm-ontology-engineering-workflow.ts",
  "lib/ontology-engineering-workflow/types.ts",
  "pm_ontology_engineering_workflow",
] as const;
const CASE_IDS = [
  "testcase:ontology-workflow-no-runtime-question-ui",
  "testcase:ontology-workflow-approved-refs-require-fde-provenance",
  "testcase:ontology-workflow-same-turn-contract-for-claude-codex",
  "testcase:ontology-workflow-mutation-authorized-only-after-sic-dtc",
  "testcase:ontology-workflow-pretool-hook-blocks-violations",
];

function makeProject(runtime: PromptRuntime): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), `pm-oe-${runtime}-`));
  tmpDirs.push(projectRoot);
  fs.writeFileSync(path.join(projectRoot, "package.json"), "{\"name\":\"oe-workflow-test\"}\n");
  return projectRoot;
}

function writeEntry(projectRoot: string, runtime: PromptRuntime): string {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: WORKFLOW_INTENT,
    projectRoot,
    promptId: `prompt-${runtime}-oe-workflow`,
    promptHash: `hash-${runtime}-oe-workflow`,
    sessionId: `session-${runtime}-oe-workflow`,
    runtime,
    createdAt: "2026-05-22T00:00:00.000Z",
  });
  return writeUniversalOntologyEntry(entry).entryRef;
}

async function createCapturedPrompt(
  projectRoot: string,
  runtime: PromptRuntime,
): Promise<PromptEnvelope> {
  const store = new PromptFrontDoorStore({ projectRoot });
  const envelope = createPromptEnvelope({
    rawPrompt: WORKFLOW_INTENT,
    sessionId: `session-${runtime}-oe-workflow`,
    runtime,
    projectRoot,
    capturedAt: "2026-05-22T00:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return envelope;
}

function semanticContract(): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved:ontology-engineering-workflow",
    status: "approved",
    rawIntent: WORKFLOW_INTENT,
    confirmedIntent:
      "Replace runtime-native question UI with a forced Ontology Engineering workflow made of FDE sessions, TurnCardDecisionSpec, WorkflowContract, SIC, DTC, and router gating.",
    nonGoals: ["Do not authorize mutation before FDE provenance and approved SIC/DTC exist."],
    approvedNouns: [
      "FDEOntologyEngineeringSession",
      "WorkflowContract",
      "TurnCardDecisionSpec",
      "UserDecisionRecord",
    ],
    approvedVerbs: ["surface", "record", "gate", "route"],
    affectedSurfaces: [...WORKFLOW_SCOPE],
    permissionsAndProposal:
      "Approved test contract for ontology-engineering workflow enforcement only.",
    acceptedRisks: [],
    downstreamAllowed: ["Route after FDE provenance and approved DTC are present."],
    downstreamForbidden: ["Do not expose or runtime-native user-input helper as contract UI."],
    clarificationQuestions: [],
    approvalRef: "user:approved:ontology-engineering-workflow-test",
  };
}

function digitalTwinContract(): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:approved:ontology-engineering-workflow",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:approved:ontology-engineering-workflow",
    affectedSurfaces: [...WORKFLOW_SCOPE],
    changeBoundary: "Workflow enforcement tests and runtime gate surfaces only.",
    branchProposalPolicy: "Keep workflow enforcement additive and release-gated.",
    permissionBoundary: "No mutation before FDE provenance and approved SIC/DTC.",
    replayMigrationPlan: "No replay migration for this deterministic test fixture.",
    observabilityPlan: "Assert semantic gate, router, workflow state, and eval-suite mapping.",
    toolSurfaceReadiness:
      "Use pm_ontology_engineering_workflow and text-renderable TurnCardDecisionSpec decisions.",
    evaluationPlan:
      "Run ontology-engineering-cross-runtime-enforcement tests and release self-check mapping.",
    touchedOntologyRefs: [
      {
        kind: "ObjectType",
        rid: "ontology://palantir-mini/object/WorkflowContract",
        displayName: "WorkflowContract",
        project: "palantir-mini",
        sourcePath: "lib/ontology-engineering-workflow/types.ts",
        confidence: "exact",
      },
      {
        kind: "LinkType",
        rid: "ontology://palantir-mini/link/FdeSessionGovernsWorkflowContract",
        displayName: "FdeSessionGovernsWorkflowContract",
        project: "palantir-mini",
        sourcePath: "lib/ontology-engineering-workflow/types.ts",
        confidence: "exact",
      },
      {
        kind: "ActionType",
        rid: "ontology://palantir-mini/action/RecordWorkflowDecision",
        displayName: "RecordWorkflowDecision",
        project: "palantir-mini",
        sourcePath: "lib/ontology-engineering-workflow/types.ts",
        confidence: "exact",
      },
      {
        kind: "Function",
        rid: "ontology://palantir-mini/function/DeriveMutationAuthorization",
        displayName: "DeriveMutationAuthorization",
        project: "palantir-mini",
        sourcePath: "lib/ontology-engineering-workflow/index.ts",
        confidence: "exact",
      },
    ],
    requiredEvaluationRefs: [
      {
        kind: "ValidationPack",
        rid: "project://palantir-mini/validation-pack/ontology-engineering-cross-runtime-enforcement",
        displayName: "ontology-engineering-cross-runtime-enforcement",
        project: "palantir-mini",
        sourcePath: "tests/cross-runtime/ontology-engineering-workflow-enforcement.test.ts",
        confidence: "exact",
      },
    ],
    fillPolicy: "ontology-dtc-build",
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-05-27T00:00:00.000Z",
      source: "agent",
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: ["ontology://palantir-mini/object/WorkflowContract"],
      linkTypeRefs: ["ontology://palantir-mini/link/FdeSessionGovernsWorkflowContract"],
      actionTypeRefs: ["ontology://palantir-mini/action/RecordWorkflowDecision"],
      functionRefs: ["ontology://palantir-mini/function/DeriveMutationAuthorization"],
      applicationStateRefs: ["application-state:ontology-engineering-workflow"],
      evaluationRefs: [
        "project://palantir-mini/validation-pack/ontology-engineering-cross-runtime-enforcement",
      ],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    approvalRef: "user:approved:ontology-engineering-workflow-test",
  } as unknown as DigitalTwinChangeContract;
}

function approvedGateInput(
  project: string,
  runtime: PromptRuntime,
  prompt: PromptEnvelope,
  fdeRef?: string,
) {
  return {
    project,
    rawIntent: WORKFLOW_INTENT,
    scopePaths: [...WORKFLOW_SCOPE],
    complexityHint: "cross-cutting" as const,
    runtime,
    promptId: prompt.promptId,
    promptHash: prompt.promptHash,
    sessionId: prompt.sessionId,
    semanticIntentContract: semanticContract(),
    digitalTwinChangeContract: digitalTwinContract(),
    ...(fdeRef ? { fdeOntologyEngineeringSessionRef: fdeRef } : {}),
  };
}

function approvedRouterInput(
  project: string,
  runtime: PromptRuntime,
  prompt: PromptEnvelope,
  fdeRef?: string,
) {
  return {
    project,
    intent: WORKFLOW_INTENT,
    scopePaths: [...WORKFLOW_SCOPE],
    complexityHint: "cross-cutting" as const,
    runtime,
    promptId: prompt.promptId,
    promptHash: prompt.promptHash,
    sessionId: prompt.sessionId,
    semanticIntentContract: semanticContract(),
    digitalTwinChangeContract: digitalTwinContract(),
    ...(fdeRef ? { fdeOntologyEngineeringSessionRef: fdeRef } : {}),
  };
}

function legacyRuntimeUiKeyCount(value: unknown): number {
  const legacyKeys = new Set([
    ["Ask", "User", "Question"].join(""),
    ["request", "user", "input"].join("_"),
    ["manual", "review", "card"].join("-"),
    ["ask", "UserQuestionQueue"].join(""),
    ["ask", "UserQuestionPayload"].join(""),
    ["runtime", "QuestionUi"].join(""),
  ]);
  let count = 0;
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (candidate === null || typeof candidate !== "object") return;
    for (const [key, nested] of Object.entries(candidate as Record<string, unknown>)) {
      if (legacyKeys.has(key)) count += 1;
      visit(nested);
    }
  };
  visit(value);
  return count;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Ontology Engineering cross-runtime enforcement eval suite", () => {
  test("suite declaration matches executable cases", () => {
    expect(suiteDeclaration.suite.suiteId)
      .toBe("suite:ontology-engineering-cross-runtime-enforcement");
    expect(suiteDeclaration.suite.testCaseIds).toEqual(CASE_IDS);
    expect(suiteDeclaration.testCases.map((testCase) => testCase.testCaseId))
      .toEqual(CASE_IDS);
    expect(suiteDeclaration.suite.evaluatorPolicy.requiredMetrics).toEqual([
      "legacy_runtime_ui_field_count",
      "fde_provenance_block_count",
      "cross_runtime_shape_match_count",
      "mutation_authorization_guard_count",
      "pretool_hook_block_count",
    ]);
  });

  test("approved workflow-control-plane gate still requires FDE provenance and no runtime-native question UI", async () => {
    for (const runtime of ["claude", "codex"] as const) {
      const project = makeProject(runtime);
      const prompt = await createCapturedPrompt(project, runtime);
      const gate = await semanticIntentGate(approvedGateInput(project, runtime, prompt));
      const route = await routeIntent(approvedRouterInput(project, runtime, prompt));

      expect(gate.status).toBe("contract_required");
      expect(gate.allowsRouting).toBe(false);
      expect(gate.gate.reason).toContain("FDEOntologyEngineeringSession provenance");
      expect(route.contractGate.status).toBe("contract_required");
      expect(route.contractGate.reason).toContain("FDEOntologyEngineeringSession provenance");
      expect(legacyRuntimeUiKeyCount(gate)).toBe(0);
      expect(legacyRuntimeUiKeyCount(route)).toBe(0);
    }
  });

  test("Claude and Codex share the same workflow contract path once FDE provenance exists", async () => {
    const summaries = [];
    for (const runtime of ["claude", "codex"] as const) {
      const project = makeProject(runtime);
      const prompt = await createCapturedPrompt(project, runtime);
      const entryRef = writeEntry(project, runtime);
      const workflow = await handleOntologyEngineeringWorkflow({
        action: "start",
        projectRoot: project,
        universalOntologyEntryRef: entryRef,
        sessionId: `fde-${runtime}-workflow`,
        createdAt: "2026-05-22T00:01:00.000Z",
      });
      const gate = await semanticIntentGate(
        approvedGateInput(project, runtime, prompt, workflow.sessionRef),
      );
      const route = await routeIntent(
        approvedRouterInput(project, runtime, prompt, workflow.sessionRef),
      );

      expect(gate.status).toBe("pass");
      expect(route.contractGate.status).toBe("pass");
      expect(gate.workflowContract?.runtime).toBe(runtime);
      expect(gate.workflowContract?.mutationAuthorized).toBe(true);
      expect(legacyRuntimeUiKeyCount(gate)).toBe(0);
      expect(legacyRuntimeUiKeyCount(route)).toBe(0);

      summaries.push({
        gateStatus: gate.status,
        gateAllowsRouting: gate.allowsRouting,
        workflowPhase: gate.workflowContract?.currentPhase,
        workflowMutationAuthorized: gate.workflowContract?.mutationAuthorized,
        allowedNextActions: gate.workflowContract?.allowedNextActions,
        routerGateStatus: route.contractGate.status,
        routerDecisionPrefix: route.decision.replace(/ontology-steward|lead-direct/g, "stable"),
      });
    }

    expect(summaries[0]).toEqual(summaries[1]);
  });

  test("pm_ontology_engineering_workflow authorizes mutation only after approved SIC, DTC, and work decision evidence", async () => {
    const project = makeProject("codex");
    const entryRef = writeEntry(project, "codex");
    const start = await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot: project,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-codex-workflow",
      createdAt: "2026-05-22T00:01:00.000Z",
    });
    expect(start.state.mutationAuthorized).toBe(false);

    const turn = await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot: project,
      sessionId: "fde-codex-workflow",
      sanitizedTurnSummary:
        "Confirmed workflow contracts, turn-card decisions, and FDE provenance requirements.",
      signal: {
        mission: {
          operationalDecision: "Force ontology engineering through a workflow contract.",
          decisionOwnerRole: "Lead Ontology Steward",
          successSignals: ["same workflow across Claude and Codex"],
        },
        evidence: {
          evidenceDefinition: "Gate/router/workflow tests and release eval mapping.",
          observableSignals: ["passing deterministic tests"],
          sourceArtifactRefs: ["suite:ontology-engineering-cross-runtime-enforcement"],
          missingEvidenceQuestions: [],
        },
        objectNames: ["WorkflowContract", "TurnCardDecisionSpec", "UserDecisionRecord"],
        linkNames: ["FDE session authorizes semantic drafting"],
        actionNames: ["Record workflow decision"],
        functionNames: ["derive mutation authorization"],
        chatbotContextNames: ["Ontology engineering lead state"],
        sourceRefs: ["suite:ontology-engineering-cross-runtime-enforcement"],
      },
      emittedAt: "2026-05-22T00:02:00.000Z",
    });
    expect(turn.state.mutationAuthorized).toBe(false);
    expect(turn.state.turnDecisionSpecs.length).toBeGreaterThan(0);

    const draft = await handleOntologyEngineeringWorkflow({
      action: "draft_sic",
      projectRoot: project,
      sessionId: "fde-codex-workflow",
      affectedSurfaces: [...WORKFLOW_SCOPE],
      emittedAt: "2026-05-22T00:03:00.000Z",
    });
    expect(draft.semanticIntentContract?.status).toBe("draft");
    expect(draft.state.mutationAuthorized).toBe(false);

    const contractsOnly = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot: project,
      sessionId: "fde-codex-workflow",
      semanticIntentContractRef: "semantic-intent:approved:ontology-engineering-workflow",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "digital-twin-change:approved:ontology-engineering-workflow",
      digitalTwinChangeContractStatus: "approved",
      workContractRef: "work-contract:ontology-engineering-workflow",
    });
    expect(contractsOnly.state.phase).toBe("digital-twin-approved");
    expect(contractsOnly.state.mutationAuthorized).toBe(false);

    const approved = await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot: project,
      sessionId: "fde-codex-workflow",
      sanitizedTurnSummary:
        "User approved the workflow-control-plane mutation boundary.",
      semanticIntentContractRef: "semantic-intent:approved:ontology-engineering-workflow",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "digital-twin-change:approved:ontology-engineering-workflow",
      digitalTwinChangeContractStatus: "approved",
      workContractRef: "work-contract:ontology-engineering-workflow",
      choiceApplications: [
        {
          decisionId: "workflow-control-policy",
          choiceId: "workflow-control-policy.recommended",
          kind: "accept",
          decision: "accepted",
          approvedMutationBoundary: "plugin-source-tests-only:ontology-engineering-workflow",
          fdeSessionRef: "fde-ontology-engineering://session/fde-codex-workflow",
        },
      ],
      emittedAt: "2026-05-22T00:04:00.000Z",
    });
    expect(approved.state.phase).toBe("mutation-authorized");
    expect(approved.state.allowedNextActions).toEqual(["status"]);
    expect(approved.state.mutationAuthorized).toBe(true);
  });
});
