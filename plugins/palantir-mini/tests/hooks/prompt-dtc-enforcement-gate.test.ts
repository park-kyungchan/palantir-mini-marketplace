import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate, {
  __test__,
} from "../../hooks/prompt-dtc-enforcement-gate";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
} from "../../lib/prompt-front-door";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";
import {
  recordSicApproval,
  invalidateSicApprovalMemoryCache,
  SIC_CACHE_TTL_MS,
} from "../../lib/prompt-front-door/sic-approval-cache";
import type { FDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/types";
import { writeFDEOntologyEngineeringSessionSnapshot } from "../../lib/fde-ontology-engineering/session-store";
import { educationProjectScope } from "../../lib/project-scope/education-defaults";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-dtc-gate-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{\"name\":\"prompt-dtc-gate-test\"}\n");
  return dir;
}

function writeEducationProjectScope(project: string): void {
  fs.writeFileSync(
    path.join(project, ".palantir-mini", "project-scope.json"),
    JSON.stringify(educationProjectScope, null, 2) + "\n",
  );
}

function semanticContract(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:approved:prompt-dtc-gate",
    status: "approved",
    rawIntent: "Add prompt-DTC enforcement gates",
    confirmedIntent: "Gate mutating tools until prompt-local DTC approval exists.",
    nonGoals: ["Do not promote schemas in Wave 4."],
    approvedNouns: ["PromptEnvelope", "SemanticIntentContract", "DigitalTwinChangeContract"],
    approvedVerbs: ["gate", "validate", "deny"],
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
      ".claude/plugins/palantir-mini/hooks/hooks.json",
    ],
    permissionsAndProposal: "Approved for plugin-local PreToolUse enforcement only.",
    acceptedRisks: [],
    downstreamAllowed: ["Add advisory and blocking prompt-DTC gate behavior."],
    downstreamForbidden: ["Do not change default mode away from advisory."],
    clarificationQuestions: [],
    approvedCanonicalTermRefs: ["term:prompt-dtc-gate"],
    approvedTermMappingRefs: ["mapping:prompt-dtc-gate"],
    semanticConsistencyResultRef: "semantic-resolver-run:prompt-dtc-gate",
    approvalRef: "user:approved:wave4",
    ...overrides,
  };
}

function digitalTwinContract(
  semanticRef = "semantic-intent:approved:prompt-dtc-gate",
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin-change:approved:prompt-dtc-gate",
    status: "approved",
    semanticIntentContractRef: semanticRef,
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
      ".claude/plugins/palantir-mini/hooks/hooks.json",
    ],
    changeBoundary: "Plugin-local PreToolUse prompt-DTC enforcement only.",
    branchProposalPolicy: "Ship as Wave 4 after Wave 3 persistence lands.",
    permissionBoundary: "No direct home plugin sync in this PR.",
    replayMigrationPlan: "No replay migration; gate reads prompt-front-door records.",
    observabilityPlan: "Emit failed gate events with refinementTarget.",
    toolSurfaceReadiness: "Codex PreToolUse payloads use existing tool fields.",
    evaluationPlan: "Targeted hook tests, typecheck, hook manifest validation.",
    requiredEvaluationRefs: [{
      kind: "ValidationPack",
      rid: "project://palantir-mini/validation-pack/prompt-dtc-gate",
      displayName: "prompt-dtc-gate",
      project: "palantir-mini",
      confidence: "exact",
    }],
    fillPolicy: "ontology-dtc-build",
    semanticConsistencyRefs: ["semantic-resolver-run:prompt-dtc-gate"],
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-05-30T00:00:00.000Z",
      source: "agent" as const,
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: [],
      linkTypeRefs: [],
      actionTypeRefs: [],
      functionRefs: [],
      applicationStateRefs: [],
      evaluationRefs: ["project://palantir-mini/validation-pack/prompt-dtc-gate"],
      semanticTermRefs: ["semantic-resolver-run:prompt-dtc-gate"],
      nonApplicablePrimitiveKinds: [
        "ObjectType",
        "LinkType",
        "ActionType",
        "Function",
        "ApplicationState",
      ],
      nonApplicableEvidenceRefs: ["test://prompt-dtc-gate-non-applicable"],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    requiredUserDecisions: [{
      decisionId: "decision-technology-review",
      domain: "TECHNOLOGY",
      label: "Technology review closed for prompt-DTC hook tests",
      status: "approved",
      blocking: true,
      evidenceRefs: ["test://technology-review"],
      approvalRef: "user:approved:technology-review",
    }],
    approvalRef: "user:approved:wave4",
    ...overrides,
  };
}

async function capturedPrompt(project: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt: "Implement prompt-DTC enforcement gates.",
    sessionId: "session-wave4",
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-05-10T04:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return { store, envelope };
}

async function pluginOptOutPrompt(project: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt: "palantir-mini plugin 사용하지 말고 파일 수정해",
    sessionId: "session-wave4",
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-05-31T00:00:00.000Z",
    sequence: 1,
    palantirMiniPluginOptOut: {
      explicit: true,
      matchedMarker: "palantir-mini plugin 사용하지 말고",
      reason: "User requested plugin-free execution.",
    },
  });
  await store.saveEnvelope(envelope);
  return { store, envelope };
}

async function approvedPrompt(
  project: string,
  overrides: {
    semantic?: Partial<SemanticIntentContract>;
    digitalTwin?: Partial<DigitalTwinChangeContract>;
  } = {},
) {
  const { store, envelope } = await capturedPrompt(project);
  const semanticRecord = await store.writeContractRecord(
    envelope,
    "semantic-intent",
    semanticContract(overrides.semantic),
  );
  const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
    semanticIntentContractRef: semanticRecord.ref,
  });
  const semanticApproved = transitionPromptEnvelope(semanticDrafted, "semantic_intent_approved", {
    approvalRef: "user:approved:wave4",
  });
  const digitalTwinRecord = await store.writeContractRecord(
    semanticApproved,
    "digital-twin-change",
    digitalTwinContract(semanticRecord.ref, overrides.digitalTwin),
  );
  const digitalTwinDrafted = transitionPromptEnvelope(semanticApproved, "digital_twin_drafted", {
    digitalTwinChangeContractRef: digitalTwinRecord.ref,
  });
  const digitalTwinApproved = transitionPromptEnvelope(
    digitalTwinDrafted,
    "digital_twin_approved",
    { approvalRef: "user:approved:wave4" },
  );
  await store.saveEnvelope(digitalTwinApproved);
  return { store, envelope: digitalTwinApproved };
}

function writeReadOnlyFDESession(
  project: string,
  overrides: Partial<FDEOntologyEngineeringSession> = {},
): FDEOntologyEngineeringSession {
  const session: FDEOntologyEngineeringSession = {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-ontology-engineering:prompt-dtc-gate",
    projectRoot: project,
    universalOntologyEntryRef: "universal-ontology-entry://prompt-dtc-gate",
    phase: "object-type-discovery",
    turnCount: 1,
    userFacingSummary: "Read-only FDE ontology engineering session.",
    confirmedNonGoals: ["Do not mutate before SIC/DTC approval."],
    latentHypotheses: [],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    objectCandidates: [],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    sourceRefs: ["universal-ontology-entry://prompt-dtc-gate"],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:10:00.000Z",
    ...overrides,
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

function payload(project: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: project,
    session_id: "session-wave4",
    tool_name: "Edit",
    tool_input: {
      file_path: "src/example.ts",
    },
    ...overrides,
  };
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

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE =
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
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
  if (savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS === undefined) {
    delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
  } else {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS =
      savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
  }
  for (const dir of tmpDirs.splice(0)) {
    invalidateSicApprovalMemoryCache(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("prompt-dtc-enforcement-gate", () => {
  test("advisory mode reports pending DTC without denying mutating edit", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "advisory";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(payload(project));

    expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
    expect(result.decision).toBeUndefined();
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(result.hookSpecificOutput?.additionalContext).toContain("Current prompt has no");

    const event = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        entry.payload?.errorClass === "prompt_dtc_gate_advisory",
    );
    expect(event?.payload?.promptId).toBeDefined();
    expect(event?.payload?.promptHash).toBeDefined();
    expect(event?.payload?.runtime).toBe("codex");
    expect(event?.payload?.projectRoot).toBe(project);
    expect(event?.payload?.memoryLayers).toEqual(["semantic", "procedural"]);
    expect(event?.withWhat?.refinementTarget).toMatchObject({
      kind: "rule-conformance-policy",
      filePathOrRid: "hooks/prompt-dtc-enforcement-gate.ts",
    });
  });

  test("blocking mode denies mutating edit before Digital Twin approval", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(payload(project));

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      "Call pm_semantic_intent_gate",
    );
  });

  test("blocking mode skips prompt-DTC gate for explicit plugin opt-out", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    const { envelope } = await pluginOptOutPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: "src/example.ts",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
        },
      }),
    );

    expect(result).toEqual({ message: "palantir-mini: prompt-DTC gate OK" });
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  test("fail-closed wrapper blocks unexpected prompt-DTC hook exceptions", async () => {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    const result = await promptDtcEnforcementGate({
      cwd: { invalid: true },
      tool_name: "Edit",
      tool_input: { file_path: "src/example.ts" },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("failed closed on unexpected error");
  });

  test("blocking mode allows read-only commands and semantic gate while pending", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    await capturedPrompt(project);

    const readOnly = await promptDtcEnforcementGate(
      payload(project, {
        tool_name: "Bash",
        tool_input: { command: "git status --short" },
      }),
    );
    const semanticGate = await promptDtcEnforcementGate(
      payload(project, {
        tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
        tool_input: { rawIntent: "approve contracts" },
      }),
    );

    expect(readOnly.message).toContain("skipped");
    expect(semanticGate.message).toContain("skipped");
  });

  test("mode off is strengthen-only for protected edit mutations", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "off";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(payload(project));

    expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
    expect(result.additionalContext).toContain("SCOPED-BLOCKING");
    expect(result.additionalContext).toContain("Call pm_semantic_intent_gate");
  });

  test("blocking mode allows mutating edit after approved prompt-local contracts", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    const { envelope } = await approvedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
        },
      }),
    );

    expect(result).toEqual({ message: "palantir-mini: prompt-DTC gate OK" });
    const event = readEvents(project).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        entry.payload?.errorClass === "prompt_dtc_gate_passed",
    );
    expect(event?.payload?.promptId).toBe(envelope.promptId);
    expect(event?.payload?.promptHash).toBe(envelope.promptHash);
    expect(event?.payload?.runtime).toBe(envelope.runtime);
    expect(event?.payload?.projectRoot).toBe(project);
    expect(event?.payload?.contractRefs).toMatchObject({
      semanticIntentContractRef: envelope.contractRefs.semanticIntentContractRef,
      digitalTwinChangeContractRef: envelope.contractRefs.digitalTwinChangeContractRef,
      approvalRef: envelope.contractRefs.approvalRef,
    });
  });

  test("blocking mode denies projectScope lane mutation when contract omits lane", async () => {
    const project = makeTmpProject();
    writeEducationProjectScope(project);
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    const { envelope } = await approvedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: "src/lib/jsxGraphRenderer.ts",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
        },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("ProjectScope conformance failed");
    expect(result.reason).toContain("seq.rendering-scene");
  });

  test("blocking mode allows projectScope lane mutation when lane and validation packs are approved", async () => {
    const project = makeTmpProject();
    writeEducationProjectScope(project);
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    const projectLaneRef = {
      kind: "ProjectLane" as const,
      rid: "project://palantir-math/lane/seq.rendering-scene",
      displayName: "seq.rendering-scene",
      project: "palantir-math",
      confidence: "exact" as const,
      laneId: "seq.rendering-scene",
      axisId: "rendering-semantics",
      writerSurfaces: ["Sequencer"],
      readerSurfaces: ["Sequencer", "Presenter", "PlayBook"],
    };
    const requiredEvaluationRefs = [
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
    const { envelope } = await approvedPrompt(project, {
      semantic: {
        affectedSurfaces: ["seq.rendering-scene"],
        approvedLaneRefs: [projectLaneRef],
      },
      digitalTwin: {
        affectedSurfaces: ["seq.rendering-scene"],
        touchedOntologyRefs: [projectLaneRef],
        permittedMutationSurfaces: [{
          mutationKind: "write",
          surfaceRef: {
            kind: "FileSurface",
            rid: "file:src/lib/*.ts",
            sourcePath: "src/lib/",
            pathGlob: "src/lib/*.ts",
            confidence: "exact",
          },
        }],
        requiredUserDecisions: [{
          decisionId: "decision-technology-review",
          domain: "TECHNOLOGY",
          label: "Technology review closed for project lane mutation",
          status: "approved",
          blocking: true,
          evidenceRefs: ["test://technology-review"],
          approvalRef: "user:approved:technology-review",
        }],
        requiredEvaluationRefs,
        evaluationPlan:
          "Run deterministic-core, capability-routing, presenter-parity, ontology-runtime-drift.",
      },
    });

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: "src/lib/jsxGraphRenderer.ts",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
        },
      }),
    );

    expect(result).toEqual({ message: "palantir-mini: prompt-DTC gate OK" });
  });

  test("contract ref continuity mismatch denies in blocking mode", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    const { store, envelope } = await capturedPrompt(project);
    const otherEnvelope = createPromptEnvelope({
      rawPrompt: "Different prompt",
      sessionId: "session-wave4",
      runtime: "codex",
      projectRoot: project,
      capturedAt: "2026-05-10T04:01:00.000Z",
      sequence: 2,
    });
    const semanticRecord = await store.writeContractRecord(
      otherEnvelope,
      "semantic-intent",
      semanticContract({ contractId: "semantic-intent:other" }),
    );
    const digitalTwinRecord = await store.writeContractRecord(
      otherEnvelope,
      "digital-twin-change",
      digitalTwinContract(semanticRecord.ref, {
        contractId: "digital-twin-change:other",
      }),
    );
    const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
      semanticIntentContractRef: semanticRecord.ref,
    });
    const semanticApproved = transitionPromptEnvelope(semanticDrafted, "semantic_intent_approved", {
      approvalRef: "user:approved:wave4",
    });
    const digitalTwinDrafted = transitionPromptEnvelope(semanticApproved, "digital_twin_drafted", {
      digitalTwinChangeContractRef: digitalTwinRecord.ref,
    });
    const badEnvelope = transitionPromptEnvelope(digitalTwinDrafted, "digital_twin_approved", {
      approvalRef: "user:approved:wave4",
    });
    await store.saveEnvelope(badEnvelope);

    const result = await promptDtcEnforcementGate(payload(project));

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("promptId/promptHash continuity");
  });

  test("Bash classifier separates read-only inspection from mutation", () => {
    expect(__test__.isReadOnlyBash("git status --short")).toBe(true);
    expect(
      __test__.isReadOnlyBash("bun test tests/hooks/prompt-dtc-enforcement-gate.test.ts"),
    ).toBe(true);
    expect(__test__.isReadOnlyBash("git commit -m test")).toBe(false);
    expect(__test__.isReadOnlyBash("echo test > out.txt")).toBe(false);
    expect(
      __test__.isMutatingCandidate({ tool_name: "Bash", tool_input: { command: "rm x" } }),
    ).toBe(true);
    expect(
      __test__.isMutatingCandidate({
        tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
      }),
    ).toBe(false);
  });

  // PR-11: pre_mutation_governance_decided event emitted on approved prompt
  test("PR-11: emits pre_mutation_governance_decided with ruleApplied on gate pass", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    const { envelope } = await approvedPrompt(project);

    await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: envelope.sessionId,
          runtime: envelope.runtime,
        },
      }),
    );

    // Give fire-and-forget emissions time to flush
    await new Promise((resolve) => setTimeout(resolve, 150));

    const events = readEvents(project);
    const govEvent = events.find((e) => e.type === "pre_mutation_governance_decided");
    expect(govEvent).toBeDefined();
    expect(govEvent?.payload?.ruleApplied).toBeDefined();
    expect(govEvent?.payload?.allowed).toBe(true);
  });

  // PR 5.11 — selective-blocking mode tests
  describe("selective-blocking mode (PR 5.11)", () => {
    test("mode off (explicit) is strengthened for commit_edits", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "off";
      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        }),
      );
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("BLOCKING");
      expect(result.reason).toContain("Run pm_semantic_intent_gate");
    });

    test("selective-blocking + generic edit becomes scoped advisory", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      await capturedPrompt(project);

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "Edit",
          tool_input: { file_path: "src/example.ts" },
        }),
      );
      expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
      expect(result.additionalContext).toContain("SCOPED-BLOCKING");
      expect(result.decision).toBeUndefined();
    });

    test("selective-blocking + non-ontology MCP tool → no gate", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__impact_query",
        }),
      );
      expect(result.message).toContain("not ontology-affecting");
      expect(result.decision).toBeUndefined();
    });

    test("selective-blocking + ontology tool (commit_edits) + no SIC approval → blocks", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      // No prompt set up, no SIC approval → cache miss → gate blocks

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        }),
      );
      expect(result.decision).toBe("block");
      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
      expect(result.reason).toContain("BLOCKING");
      expect(result.reason).toContain("No current prompt-front-door envelope");
    });

    test("selective-blocking + apply_edit_function + no SIC approval → blocks", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
        }),
      );
      expect(result.decision).toBe("block");
      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    });

    test("selective-blocking + ontology_context_query read-only → no gate", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";

      // No action = read-only
      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
          tool_input: { scope: "test" },
        }),
      );
      expect(result.message).toContain("read-only or allowed");
      expect(result.decision).toBeUndefined();
    });

    test("selective-blocking + ontology_context_query mutation → gates", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
          tool_input: { action: "write", scope: "test" },
        }),
      );
      expect(result.decision).toBe("block");
    });

    test("selective-blocking + PreToolUse without prompt + current read-only FDE session → advisory skip", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      await capturedPrompt(project);
      const fdeSession = writeReadOnlyFDESession(project);

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__palantir_mini__ontology_context_query",
          tool_input: { scopePaths: ["lib/chatbot-studio"] },
        }),
      );

      expect(result.decision).toBeUndefined();
      expect(result.message).toContain("FDE ontology-engineering read-only session");
      expect(result.additionalContext).toContain(fdeSession.sessionId);
      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();

      const event = readEvents(project).find(
        (entry) =>
          entry.type === "validation_phase_completed" &&
          entry.payload?.errorClass === "fde_readonly_skip_contract_required",
      );
      expect(event?.payload?.source).toBe("prompt-front-door+fde-session");
      expect(event?.payload?.fdeEngineeringSessionId).toBe(fdeSession.sessionId);
      expect(event?.payload?.protectedMutation).toBe(false);
    });

    test("selective-blocking + PreToolUse without prompt + current read-only FDE session + mutation → blocks", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      await capturedPrompt(project);
      writeReadOnlyFDESession(project);

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__palantir_mini__commit_edits",
          tool_input: { targetFiles: ["lib/chatbot-studio/workbench-state.ts"] },
        }),
      );

      expect(result.decision).toBe("block");
      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
      expect(result.reason).toContain("BLOCKING");
      expect(result.reason).toContain("Current prompt has no SemanticIntentContract ref");
    });

    test("selective-blocking + SIC approval within 60min → still blocks protected mutation without DTC", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      const promptId = "test-prompt-id-selective-001";

      // Record a fresh SIC approval
      recordSicApproval(project, promptId, "user:approved:test");

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
          tool_input: { promptId },
        }),
      );
      expect(result.decision).toBe("block");
      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
      expect(result.reason).toContain("BLOCKING");
      expect(result.reason).toContain("No current prompt-front-door envelope");
    });

    test("selective-blocking + SIC approval 61+ min ago → expired → blocks", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      const promptId = "test-prompt-id-selective-expired";

      // Write an expired entry directly to disk cache
      const cacheDir = path.join(project, ".palantir-mini", "session");
      fs.mkdirSync(cacheDir, { recursive: true });
      const expiredAt = new Date(Date.now() - SIC_CACHE_TTL_MS - 5000).toISOString();
      fs.writeFileSync(
        path.join(cacheDir, "sic-approval-cache.json"),
        JSON.stringify({
          entries: [{ promptId, approvedAt: expiredAt, projectRoot: project }],
          updatedAt: expiredAt,
        }),
      );

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
          tool_input: { promptId },
        }),
      );
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("BLOCKING");
    });

    test("selective-blocking + PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 cannot bypass protected commit_edits", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS = "1";

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        }),
      );
      expect(result.message).toContain("BLOCKED");
      expect(result.decision).toBe("block");
    });

    test("__test__ helpers: isOntologyAffectingForSelectiveBlocking", () => {
      expect(
        __test__.isOntologyAffectingForSelectiveBlocking({
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        }),
      ).toBe(true);
      expect(
        __test__.isOntologyAffectingForSelectiveBlocking({
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
        }),
      ).toBe(true);
      expect(
        __test__.isOntologyAffectingForSelectiveBlocking({
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__impact_query",
        }),
      ).toBe(false);
      expect(
        __test__.isOntologyAffectingForSelectiveBlocking({
          tool_name: "Edit",
          tool_input: { file_path: "src/foo.ts" },
        }),
      ).toBe(false);
      // ontology_context_query: no action → read-only → not affecting
      expect(
        __test__.isOntologyAffectingForSelectiveBlocking({
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
          tool_input: { scope: "test" },
        }),
      ).toBe(false);
      // ontology_context_query: write action → affecting
      expect(
        __test__.isOntologyAffectingForSelectiveBlocking({
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
          tool_input: { action: "write" },
        }),
      ).toBe(true);
      expect(
        __test__.isMutatingCandidate({
          tool_name: "mcp__palantir_mini__ontology_context_query",
          tool_input: { action: "read" },
        }),
      ).toBe(false);
      expect(
        __test__.isMutatingCandidate({
          tool_name: "mcp__palantir_mini__ontology_context_query",
          tool_input: { action: "mutate" },
        }),
      ).toBe(true);
    });
  });
});
