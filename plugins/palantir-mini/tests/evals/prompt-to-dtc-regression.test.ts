import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate from "../../hooks/prompt-dtc-enforcement-gate";
import { routeIntent } from "../../bridge/handlers/pm-intent-router";
import { semanticIntentGate } from "../../bridge/handlers/pm-semantic-intent-gate";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import {
  validateDigitalTwinChangeContract,
  validateSemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import {
  canonicalTerm,
  registrySnapshot,
  sourceSystemRef,
  sourceSystemTerm,
} from "../../lib/semantic-consistency/registry";
import { resolveSemanticConsistency } from "../../lib/semantic-consistency/resolver";
import type { SemanticConsistencyResolverInput } from "../../lib/semantic-consistency/types";
import {
  formatPromptDtcEvalReport,
  runPromptDtcEvalSuite,
  type PromptDtcEvalCase,
} from "../../lib/lead-intent/prompt-dtc-eval-suite";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
} from "../../lib/prompt-front-door";
import suiteDeclaration from "../../eval-suites/prompt-to-dtc-regression.json";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(projectName?: string): string {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-dtc-eval-"));
  tmpDirs.push(tmpRoot);
  const dir = projectName ? path.join(tmpRoot, projectName) : tmpRoot;
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{\"name\":\"prompt-dtc-eval\"}\n");
  return dir;
}

async function createCapturedPrompt(project: string, rawPrompt: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt,
    sessionId: "session-prompt-dtc-eval",
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-05-10T06:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return { store, envelope };
}

const promptDtcSource = sourceSystemRef({
  sourceSystemId: "prompt-dtc-eval-fixture",
  kind: "repo",
  displayName: "Prompt-to-DTC eval fixture",
  authorityRank: 100,
});

function promptDtcSemanticConsistencyInput(): SemanticConsistencyResolverInput {
  const terms = [
    canonicalTerm({
      displayName: "PromptEnvelope",
      definition: "Prompt-front-door identity envelope.",
      ontologyKind: "Unknown",
      approvalRef: "user:approved:prompt-dtc-eval",
    }),
    canonicalTerm({
      displayName: "SemanticIntentContract",
      definition: "Approved semantic boundary for prompt-to-DTC execution.",
      ontologyKind: "Unknown",
      approvalRef: "user:approved:prompt-dtc-eval",
    }),
    canonicalTerm({
      displayName: "seq.rendering-scene",
      definition: "Education project rendering-scene ProjectScope lane.",
      ontologyKind: "ApplicationState",
      ontologyRef: "project://palantir-math/lane/seq.rendering-scene",
      approvalRef: "user:approved:prompt-dtc-eval",
    }),
    canonicalTerm({
      displayName: "validate",
      definition: "Validate contract and routing behavior.",
      ontologyKind: "Function",
      approvalRef: "user:approved:prompt-dtc-eval",
    }),
    canonicalTerm({
      displayName: "route",
      definition: "Route approved Prompt-to-DTC execution.",
      ontologyKind: "ActionType",
      approvalRef: "user:approved:prompt-dtc-eval",
    }),
    canonicalTerm({
      displayName: "gate",
      definition: "Gate mutation surfaces by prompt-local DTC approval.",
      ontologyKind: "Function",
      approvalRef: "user:approved:prompt-dtc-eval",
    }),
  ];

  return {
    sourceTerms: [
      "PromptEnvelope",
      "SemanticIntentContract",
      "seq.rendering-scene",
      "validate",
      "route",
      "gate",
    ].map((term) =>
      sourceSystemTerm({
        sourceSystemRef: promptDtcSource,
        fieldPath: `approved-term:${term}`,
        rawTerm: term,
        evidenceRefs: ["test://prompt-to-dtc-regression/semantic-consistency"],
      }),
    ),
    registry: registrySnapshot({
      sourceSystems: [promptDtcSource],
      canonicalTerms: terms,
    }),
  };
}

const approvedSemanticConsistencyResult = resolveSemanticConsistency(
  promptDtcSemanticConsistencyInput(),
);

function semanticContract(
  overrides: Partial<SemanticIntentContract> = {},
): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved:prompt-dtc-eval",
    status: "approved",
    rawIntent: "Validate Prompt-to-DTC governance flow.",
    confirmedIntent:
      "Validate prompt identity, contract approval, routing, projectScope, and gate behavior.",
    nonGoals: ["Do not change default gate mode."],
    approvedNouns: ["PromptEnvelope", "SemanticIntentContract", "seq.rendering-scene"],
    approvedVerbs: ["validate", "route", "gate"],
    affectedSurfaces: ["seq.rendering-scene"],
    permissionsAndProposal: "Eval-only validation of Prompt-to-DTC behavior.",
    acceptedRisks: [],
    downstreamAllowed: ["Run eval-like regression cases."],
    downstreamForbidden: ["Do not mutate runtime surfaces from eval execution."],
    clarificationQuestions: [],
    approvedCanonicalTermRefs: [...approvedSemanticConsistencyResult.canonicalTermRefs],
    approvedTermMappingRefs: approvedSemanticConsistencyResult.mappings.map(
      (mapping) => mapping.mappingId,
    ),
    semanticConsistencyResultRef: approvedSemanticConsistencyResult.resolverRunId,
    approvalRef: "user:approved:prompt-dtc-eval",
    ...overrides,
  };
}

function validationPackRefs() {
  return [
    "deterministic-core",
    "capability-routing",
    "presenter-parity",
    "ontology-runtime-drift",
  ].map((pack) => ({
    kind: "ValidationPack" as const,
    rid: `project://palantir-math/validation-pack/${pack}`,
    displayName: pack,
    project: "palantir-math",
    confidence: "exact" as const,
  }));
}

function digitalTwinContract(
  semanticRef = "semantic-intent:approved:prompt-dtc-eval",
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:approved:prompt-dtc-eval",
    status: "approved",
    semanticIntentContractRef: semanticRef,
    affectedSurfaces: ["seq.rendering-scene"],
    changeBoundary: "Prompt-to-DTC eval regression only.",
    branchProposalPolicy: "Ship as Wave 10 with eval-only scope.",
    permissionBoundary: "No mutation beyond eval helper and test files.",
    replayMigrationPlan: "No replay migration.",
    observabilityPlan: "Return suite metrics and a markdown report.",
    toolSurfaceReadiness: "Use existing semantic gate, router, and prompt-DTC gate surfaces.",
    evaluationPlan:
      "Run deterministic-core, capability-routing, presenter-parity, ontology-runtime-drift.",
    requiredEvaluationRefs: validationPackRefs(),
    requiredBranchPolicyRef: {
      rid: "branch-policy://palantir-math/prompt-dtc-eval",
      displayName: "Prompt-to-DTC eval branch policy",
    },
    requiredPermissionPolicyRef: {
      rid: "permission-policy://palantir-math/prompt-dtc-eval",
      displayName: "Prompt-to-DTC eval permission policy",
    },
    touchedOntologyRefs: [
      {
        kind: "ObjectType",
        rid: "ontology://prompt-dtc/object/PromptEnvelope",
        displayName: "PromptEnvelope",
        confidence: "exact",
      },
      {
        kind: "LinkType",
        rid: "ontology://prompt-dtc/link/PromptEnvelopeAuthorizesDTC",
        displayName: "PromptEnvelopeAuthorizesDTC",
        confidence: "exact",
      },
      {
        kind: "ActionType",
        rid: "ontology://prompt-dtc/action/RouteAfterApproval",
        displayName: "RouteAfterApproval",
        confidence: "exact",
      },
      {
        kind: "Function",
        rid: "ontology://prompt-dtc/function/ValidatePromptDTC",
        displayName: "ValidatePromptDTC",
        confidence: "exact",
      },
    ],
    semanticConsistencyRefs: [approvedSemanticConsistencyResult.resolverRunId],
    fillPolicy: "ontology-dtc-build",
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-06-01T00:00:00.000Z",
      source: "agent",
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: ["ontology://prompt-dtc/object/PromptEnvelope"],
      linkTypeRefs: ["ontology://prompt-dtc/link/PromptEnvelopeAuthorizesDTC"],
      actionTypeRefs: ["ontology://prompt-dtc/action/RouteAfterApproval"],
      functionRefs: ["ontology://prompt-dtc/function/ValidatePromptDTC"],
      applicationStateRefs: ["application-state:prompt-dtc-eval"],
      evaluationRefs: validationPackRefs().map((ref) => ref.rid),
      semanticTermRefs: [
        approvedSemanticConsistencyResult.resolverRunId,
        ...approvedSemanticConsistencyResult.mappings.map((mapping) => mapping.mappingId),
      ],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    approvalRef: "user:approved:prompt-dtc-eval",
    ...overrides,
  };
}

async function approvedPrompt(project: string) {
  const { store, envelope } = await createCapturedPrompt(
    project,
    "Validate Prompt-to-DTC approved mutation path.",
  );
  const semanticRecord = await store.writeContractRecord(
    envelope,
    "semantic-intent",
    semanticContract(),
  );
  const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
    semanticIntentContractRef: semanticRecord.ref,
  });
  const semanticApproved = transitionPromptEnvelope(semanticDrafted, "semantic_intent_approved", {
    approvalRef: "user:approved:prompt-dtc-eval",
  });
  const digitalTwinRecord = await store.writeContractRecord(
    semanticApproved,
    "digital-twin-change",
    digitalTwinContract(semanticRecord.ref),
  );
  const digitalTwinDrafted = transitionPromptEnvelope(semanticApproved, "digital_twin_drafted", {
    digitalTwinChangeContractRef: digitalTwinRecord.ref,
  });
  const digitalTwinApproved = transitionPromptEnvelope(
    digitalTwinDrafted,
    "digital_twin_approved",
    { approvalRef: "user:approved:prompt-dtc-eval" },
  );
  await store.saveEnvelope(digitalTwinApproved);
  return digitalTwinApproved;
}

function gatePayload(project: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: project,
    session_id: "session-prompt-dtc-eval",
    tool_name: "Edit",
    tool_input: {
      file_path: "src/example.ts",
    },
    ...overrides,
  };
}

function withGateMode<T>(mode: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (mode === undefined) {
    delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  } else {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = mode;
  }
  return fn();
}

function makeEvalCases(): PromptDtcEvalCase[] {
  return [
    {
      id: "testcase:prompt-identity-valid-continuity",
      title: "Valid prompt identity persists contracts and routes from prompt-local refs",
      category: "prompt_identity",
      async run() {
        const project = makeTmpProject();
        const rawPrompt =
          "Implement ontology router change from approved Prompt-to-DTC contracts.";
        const { envelope } = await createCapturedPrompt(project, rawPrompt);
        const gate = await semanticIntentGate({
          project,
          rawIntent: rawPrompt,
          scopePaths: ["bridge/handlers/pm-intent-router.ts", "seq.rendering-scene"],
          complexityHint: "cross-cutting",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
          semanticIntentContract: semanticContract(),
          digitalTwinChangeContract: digitalTwinContract(),
          semanticConsistencyResolverInput: promptDtcSemanticConsistencyInput(),
        });
        const route = await routeIntent({
          project,
          intent: rawPrompt,
          scopePaths: ["bridge/handlers/pm-intent-router.ts", "seq.rendering-scene"],
          complexityHint: "cross-cutting",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
          semanticConsistencyResult:
            gate.semanticConsistencyResult ?? approvedSemanticConsistencyResult,
        });
        const passed =
          gate.status === "pass" &&
          route.contractGate.status === "pass" &&
          route.routingProjection.hasContractFields === true &&
          route.routingProjection.basis === "approved-inline-contracts";
        return {
          passed,
          details: passed
            ? "Prompt identity persisted approved contracts and router used stored fields."
            : `Unexpected gate=${gate.status} route=${route.contractGate.status}`,
          metrics: {
            promptIdentityPresent: Boolean(route.promptEnvelope?.promptId),
            hasContractFields: route.routingProjection.hasContractFields,
          },
        };
      },
    },
    {
      id: "testcase:prompt-identity-stale-hash",
      title: "Stale prompt hash fails continuity",
      category: "prompt_identity",
      async run() {
        const project = makeTmpProject();
        const rawPrompt = "Persist Prompt-to-DTC contracts.";
        const { envelope } = await createCapturedPrompt(project, rawPrompt);
        const result = await semanticIntentGate({
          project,
          rawIntent: rawPrompt,
          scopePaths: [".claude/plugins/palantir-mini/lib/prompt-front-door/store.ts"],
          complexityHint: "multi-file",
          promptId: envelope.promptId,
          promptHash: "stale-hash",
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
        });
        const passed =
          result.status === "blocked_for_clarification" &&
          result.promptContinuity?.valid === false;
        return {
          passed,
          details: passed
            ? "Stale promptHash blocked persistence."
            : `Unexpected semantic gate status: ${result.status}`,
        };
      },
    },
    {
      id: "testcase:semantic-contract-missing-nouns",
      title: "SemanticIntentContract without approved nouns is invalid",
      category: "semantic_contract",
      run() {
        const result = validateSemanticIntentContract(
          semanticContract({ approvedNouns: [] }),
        );
        const passed = !result.valid &&
          result.issues.some((issue) => issue.field === "approvedNouns");
        return {
          passed,
          details: passed
            ? "approvedNouns is a blocking validation issue."
            : "Missing approvedNouns was not reported.",
        };
      },
    },
    {
      id: "testcase:digital-twin-missing-evaluation-plan",
      title: "DigitalTwinChangeContract without evaluationPlan is invalid",
      category: "digital_twin_contract",
      run() {
        const result = validateDigitalTwinChangeContract(
          digitalTwinContract(undefined, { evaluationPlan: "" }),
        );
        const passed = !result.valid &&
          result.issues.some((issue) => issue.field === "evaluationPlan");
        return {
          passed,
          details: passed
            ? "evaluationPlan is a blocking validation issue."
            : "Missing evaluationPlan was not reported.",
        };
      },
    },
    {
      id: "testcase:routing-raw-cross-cutting-blocked",
      title: "Raw cross-cutting ontology mutation cannot route",
      category: "routing",
      async run() {
        const project = makeTmpProject();
        const result = await routeIntent({
          project,
          intent: "Implement ontology contract routing across schemas and gates.",
          scopePaths: [
            "schemas/ontology/primitives/semantic-intent-contract.ts",
            ".claude/plugins/palantir-mini/lib/lead-intent/contracts.ts",
          ],
          complexityHint: "cross-cutting",
        });
        const passed = result.decision === "contract_required" &&
          result.contractGate.requiredContracts.includes("DigitalTwinChangeContract");
        return {
          passed,
          details: passed
            ? "Raw cross-cutting ontology mutation returned contract_required."
            : `Unexpected routing decision: ${result.decision}`,
        };
      },
    },
    {
      id: "testcase:routing-project-scope-validation-ladder",
      title: "ProjectScope lane refs influence routing validation ladder",
      category: "routing",
      async run() {
        const project = makeTmpProject("palantir-math");
        const result = await routeIntent({
          project,
          intent: "Implement ontology router change for seq.rendering-scene lane.",
          scopePaths: ["src/lib/jsxGraphRenderer.ts"],
          complexityHint: "cross-cutting",
          semanticIntentContract: semanticContract(),
          digitalTwinChangeContract: digitalTwinContract(),
          semanticConsistencyResult: approvedSemanticConsistencyResult,
        });
        const packs = result.routingProjection.projectScopePolicy?.validationPacks ?? [];
        const passed =
          result.contractGate.status === "pass" &&
          packs.includes("deterministic-core") &&
          packs.includes("ontology-runtime-drift");
        return {
          passed,
          details: passed
            ? "ProjectScope lane refs projected validation packs into routing."
            : `status=${result.contractGate.status} validationPacks=${packs.join(", ")}`,
          metrics: {
            validationPackCount: packs.length,
          },
        };
      },
    },
    {
      id: "testcase:gate-selective-blocking-default",
      title: "Selective-blocking default advises ordinary mutating work",
      category: "gate",
      async run() {
        const project = makeTmpProject();
        await createCapturedPrompt(project, "Edit a file without DTC approval.");
        const result = await withGateMode(undefined, () =>
          promptDtcEnforcementGate(gatePayload(project)),
        );
        const passed =
          result.message === "palantir-mini: prompt-DTC gate advisory" &&
          result.decision === undefined &&
          result.additionalContext?.includes("Scoped blocking surface: none") === true;
        return {
          passed,
          details: passed
            ? "Default selective-blocking mode produced scoped advisory without denial."
            : `Unexpected gate result: ${result.message}`,
        };
      },
    },
    {
      id: "testcase:gate-scoped-blocking-surface",
      title: "Scoped blocking denies protected surfaces without DTC approval",
      category: "gate",
      async run() {
        const project = makeTmpProject();
        await createCapturedPrompt(project, "Edit a lead-intent contract file.");
        const result = await withGateMode("scoped-blocking", () =>
          promptDtcEnforcementGate(
            gatePayload(project, {
              tool_input: {
                file_path: ".claude/plugins/palantir-mini/lib/lead-intent/contracts.ts",
              },
            }),
          ),
        );
        const passed = result.decision === "block" &&
          result.reason?.includes("lead-intent contract surface") === true;
        return {
          passed,
          details: passed
            ? "Scoped blocking denied protected lead-intent surface."
            : `Unexpected scoped gate result: ${result.message}`,
        };
      },
    },
    {
      id: "testcase:gate-full-blocking",
      title: "Full blocking denies all mutating surfaces without DTC approval",
      category: "gate",
      async run() {
        const project = makeTmpProject();
        await createCapturedPrompt(project, "Edit ordinary source without DTC approval.");
        const result = await withGateMode("blocking", () =>
          promptDtcEnforcementGate(gatePayload(project)),
        );
        const passed = result.decision === "block" &&
          result.hookSpecificOutput?.permissionDecision === "deny";
        return {
          passed,
          details: passed
            ? "Blocking mode denied ordinary mutation without DTC approval."
            : `Unexpected blocking result: ${result.message}`,
        };
      },
    },
    {
      id: "testcase:gate-approved-contracts-pass",
      title: "Approved prompt-local contracts allow mutation in blocking mode",
      category: "gate",
      async run() {
        const project = makeTmpProject();
        const envelope = await approvedPrompt(project);
        const result = await withGateMode("blocking", () =>
          promptDtcEnforcementGate(
            gatePayload(project, {
              tool_input: {
                file_path: "src/example.ts",
                promptId: envelope.promptId,
                promptHash: envelope.promptHash,
                sessionId: envelope.sessionId,
                runtime: envelope.runtime,
              },
            }),
          ),
        );
        const passed = result.message === "palantir-mini: prompt-DTC gate OK";
        return {
          passed,
          details: passed
            ? "Blocking mode passed after approved prompt-local contracts."
            : `Unexpected approved gate result: ${result.message}`,
        };
      },
    },
  ];
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE =
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE === undefined) {
    delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  } else {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE =
      savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  }
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  } else {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  }
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) {
    delete process.env.PALANTIR_MINI_PROJECT;
  } else {
    process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Prompt-to-DTC eval-like regression suite", () => {
  test("suite declaration and executable cases stay aligned", () => {
    const declared = new Set(suiteDeclaration.suite.testCaseIds);
    const executable = new Set(makeEvalCases().map((testCase) => testCase.id));
    expect(executable).toEqual(declared);
    expect(suiteDeclaration.suite.evaluatorPolicy.minimumPassingScore).toBe(1);
    expect(suiteDeclaration.suite.evaluatorPolicy.requireHumanReviewForMutation).toBe(true);
  });

  test("runs regression cases and generates metrics report", async () => {
    const report = await runPromptDtcEvalSuite(makeEvalCases(), {
      suiteId: suiteDeclaration.suite.suiteId,
      generatedAt: "2026-05-10T06:10:00.000Z",
    });
    const markdown = formatPromptDtcEvalReport(report);
    if (report.failed > 0) {
      console.error(markdown);
    }

    expect(report.total).toBe(10);
    expect(report.failed).toBe(0);
    expect(report.passRate).toBe(1);
    expect(report.byCategory.prompt_identity.passed).toBe(2);
    expect(report.byCategory.semantic_contract.passed).toBe(1);
    expect(report.byCategory.digital_twin_contract.passed).toBe(1);
    expect(report.byCategory.routing.passed).toBe(2);
    expect(report.byCategory.gate.passed).toBe(4);
    expect(markdown).toContain("# Prompt-to-DTC Eval Report");
    expect(markdown).toContain("Aggregate: 10/10 passed (1.00)");
    expect(markdown).toContain("| gate | 4/4 | 0 | 1.00 |");
  });
});
