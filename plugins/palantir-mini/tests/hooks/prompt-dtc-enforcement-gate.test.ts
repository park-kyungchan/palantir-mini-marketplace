import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate, {
  __test__,
} from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
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

function makeTmpGlobalStateDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-prompt-dtc-gate-global-"));
  tmpDirs.push(dir);
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
  savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
  process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir();
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
  if (savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR === undefined) {
    delete process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  } else {
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR;
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

  test("blocking deny injects the Altitude-1 runbook BROWSE pointer (no-SIC → Stage 02/03)", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(payload(project));

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("Runbook: docs/altitude1-runtime-guide/BROWSE.md");
    expect(result.reason).toContain("Stage 02 (nine-axis-sic-fill)");
    expect(result.reason).toContain("Stage 03 (approve-sic)");
  });

  test("blocking deny maps not-digital_twin_approved → Stage 05/06 runbook slice", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    // Build an envelope that has an approved SIC but is NOT digital_twin_approved,
    // so assessment.errorClass = digital_twin_contract_required.
    const { store, envelope } = await capturedPrompt(project);
    const semanticRecord = await store.writeContractRecord(
      envelope,
      "semantic-intent",
      semanticContract(),
    );
    const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
      semanticIntentContractRef: semanticRecord.ref,
    });
    const semanticApproved = transitionPromptEnvelope(semanticDrafted, "semantic_intent_approved", {
      approvalRef: "user:approved:wave4",
    });
    await store.saveEnvelope(semanticApproved);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: "src/example.ts",
          promptId: semanticApproved.promptId,
          promptHash: semanticApproved.promptHash,
          sessionId: semanticApproved.sessionId,
          runtime: semanticApproved.runtime,
        },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("not digital_twin_approved");
    expect(result.reason).toContain("Runbook: docs/altitude1-runtime-guide/BROWSE.md");
    expect(result.reason).toContain("Stage 05 (dtc-fill)");
    expect(result.reason).toContain("Stage 06 (envelope-advance)");
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

    test("selective-blocking deny injects the Altitude-1 runbook BROWSE pointer + no-SIC slice", async () => {
      const project = makeTmpProject();
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "selective-blocking";
      // No prompt/envelope → assessment.errorClass = prompt_front_door_missing.

      const result = await promptDtcEnforcementGate(
        payload(project, {
          tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        }),
      );
      expect(result.decision).toBe("block");
      expect(result.reason).toContain(
        "Runbook: docs/altitude1-runtime-guide/BROWSE.md",
      );
      // no-SIC blocker → Stage 02/03 slice.
      expect(result.reason).toContain("Stage 02 (nine-axis-sic-fill)");
      expect(result.reason).toContain("Stage 03 (approve-sic)");
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

// D-i (second-brain P0) — path-aware commit floor. A `git commit` / `commit_edits`
// whose ENTIRE resolved file set is non-ontology drops from the `commit` floor
// (blocking) to `generic-mutation` (scoped floor); any ontology surface (or an
// empty / unresolvable set) stays `commit` (BLOCKING, conservative).
describe("D-i path-aware commit floor (mutationClass)", () => {
  const repoRoots: string[] = [];

  afterEach(() => {
    for (const r of repoRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  });

  function git(root: string, ...args: string[]): string {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  }

  /** A real throwaway git repo with one base commit; returns its root dir. */
  function initGitRepo(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-commit-repo-"));
    repoRoots.push(root);
    git(root, "init", "-q");
    git(root, "config", "user.email", "t@t.test");
    git(root, "config", "user.name", "test");
    fs.writeFileSync(path.join(root, "anchor.txt"), "v1\n");
    git(root, "add", "anchor.txt");
    git(root, "commit", "-q", "-m", "base");
    return root;
  }

  /** Write `relPath` (creating dirs) and `git add` it so it appears in --cached. */
  function stage(root: string, relPath: string, content = "x\n"): void {
    const abs = path.join(root, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    git(root, "add", "--", relPath);
  }

  function gitCommitPayload(root: string) {
    return {
      cwd: root,
      tool_name: "Bash",
      tool_input: { command: "git commit -m wip" },
    };
  }

  test("git commit + ALL-non-ontology staged set → generic-mutation (not commit)", () => {
    const root = initGitRepo();
    stage(root, "second-brain/x.md");
    stage(root, "_workspace/y.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      gitCommitPayload(root),
      true,
      root,
    );
    expect(cls).toBe("generic-mutation");
    expect(cls).not.toBe("commit");
  });

  test("git commit + MIXED staged set (ontology + non-ontology) → commit (blocking)", () => {
    const root = initGitRepo();
    stage(root, "schemas/ontology/primitives/foo.ts", "export const FOO = 1;\n");
    stage(root, "second-brain/x.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      gitCommitPayload(root),
      true,
      root,
    );
    expect(cls).toBe("commit");
  });

  test("git commit + ALL-ontology staged set → commit (blocking)", () => {
    const root = initGitRepo();
    stage(root, "schemas/ontology/primitives/foo.ts", "export const FOO = 1;\n");
    const cls = __test__.protectedMutationClassForPromptGate(
      gitCommitPayload(root),
      true,
      root,
    );
    expect(cls).toBe("commit");
  });

  test("git commit + EMPTY staged set → commit (conservative, blocking)", () => {
    const root = initGitRepo();
    // nothing staged beyond the base commit
    const cls = __test__.protectedMutationClassForPromptGate(
      gitCommitPayload(root),
      true,
      root,
    );
    expect(cls).toBe("commit");
  });

  test("git commit in a non-git dir → commit (execSync throws → conservative)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-nogit-"));
    repoRoots.push(dir);
    const cls = __test__.protectedMutationClassForPromptGate(
      gitCommitPayload(dir),
      true,
      dir,
    );
    expect(cls).toBe("commit");
  });

  test("allStagedPathsNonOntology: .palantir-mini/ staged path is NOT exempt", () => {
    const root = initGitRepo();
    stage(root, ".palantir-mini/ontology/objects/foo.json", "{}\n");
    expect(__test__.allStagedPathsNonOntology(root)).toBe(false);
  });

  test("allStagedPathsNonOntology: all-clean staged set is exempt", () => {
    const root = initGitRepo();
    stage(root, "second-brain/a.md");
    stage(root, "docs/b.md");
    expect(__test__.allStagedPathsNonOntology(root)).toBe(true);
  });

  test("isNonOntologyPath guards .palantir-mini/ and schemas/ontology/", () => {
    const root = "/tmp/proj";
    expect(__test__.isNonOntologyPath(".palantir-mini/x.json", root)).toBe(false);
    expect(__test__.isNonOntologyPath("a/schemas/ontology/x.ts", root)).toBe(false);
    expect(__test__.isNonOntologyPath("second-brain/x.md", root)).toBe(true);
    expect(__test__.isNonOntologyPath("_workspace/y.md", root)).toBe(true);
  });

  // REGRESSION + bd-017 conservative fallback — a fresh repo has no upstream and no
  // commits ahead of any base, so the push/PR range is empty/unresolvable → the
  // release / pull-request floor is PRESERVED (blocking).
  test("REGRESSION: git push, unresolvable/empty range → release (blocking)", () => {
    const root = initGitRepo();
    const cls = __test__.protectedMutationClassForPromptGate(
      { cwd: root, tool_name: "Bash", tool_input: { command: "git push origin main" } },
      true,
      root,
    );
    expect(cls).toBe("release");
  });

  test("REGRESSION: gh pr create, unresolvable/empty range → pull-request (blocking)", () => {
    const root = initGitRepo();
    const cls = __test__.protectedMutationClassForPromptGate(
      { cwd: root, tool_name: "Bash", tool_input: { command: "gh pr create --fill" } },
      true,
      root,
    );
    expect(cls).toBe("pull-request");
  });

  test("REGRESSION: mutating non-git bash → external-command", () => {
    const root = initGitRepo();
    const cls = __test__.protectedMutationClassForPromptGate(
      { cwd: root, tool_name: "Bash", tool_input: { command: "rm -rf build" } },
      true,
      root,
    );
    expect(cls).toBe("external-command");
  });

  // commit_edits lane: resolved target set drives the floor.
  test("commit_edits + ALL-non-ontology resolved targets → generic-mutation", () => {
    const root = initGitRepo();
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: root,
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        tool_input: { file_path: "second-brain/note.md" },
      },
      true,
      root,
    );
    expect(cls).toBe("generic-mutation");
  });

  test("commit_edits + an ontology resolved target → commit (blocking)", () => {
    const root = initGitRepo();
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: root,
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        tool_input: { file_path: "schemas/ontology/primitives/foo.ts" },
      },
      true,
      root,
    );
    expect(cls).toBe("commit");
  });

  test("commit_edits + unresolvable target set (empty) → commit (conservative)", () => {
    const root = initGitRepo();
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: root,
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        tool_input: {},
      },
      true,
      root,
    );
    expect(cls).toBe("commit");
  });
});

// bd-019 (cross-repo `git -C` commit) — bd-010's de-floor resolved the staged set from
// the SESSION-CWD repo, so a `git -C <other-repo> commit` was evaluated against the
// wrong repo (session-CWD staged set empty/unrelated → unresolvable→conservative
// BLOCKING) and over-blocked a legitimately all-non-ontology cross-repo commit. The fix
// parses `-C <dir>` / `--work-tree` and resolves the staged set from the TARGET repo,
// falling back to the session CWD when no override is present.
describe("bd-019 cross-repo `git -C` commit floor (mutationClass)", () => {
  const repoRoots: string[] = [];

  afterEach(() => {
    for (const r of repoRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  });

  function git(root: string, ...args: string[]): string {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  }

  function initGitRepo(prefix = "pm-dtc-gate-bd019-"): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    repoRoots.push(root);
    git(root, "init", "-q");
    git(root, "config", "user.email", "t@t.test");
    git(root, "config", "user.name", "test");
    fs.writeFileSync(path.join(root, "anchor.txt"), "v1\n");
    git(root, "add", "anchor.txt");
    git(root, "commit", "-q", "-m", "base");
    return root;
  }

  function stage(root: string, relPath: string, content = "x\n"): void {
    const abs = path.join(root, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    git(root, "add", "--", relPath);
  }

  // PAIRED TEST (bd-019): a `git -C <other-repo>` all-non-ontology commit de-floors,
  // even though the SESSION-CWD repo has nothing (or unrelated/ontology) staged.
  test("git -C <other-repo> commit, target ALL-non-ontology → generic-mutation (session CWD repo is empty)", () => {
    const sessionRepo = initGitRepo("pm-dtc-gate-bd019-session-");
    const targetRepo = initGitRepo("pm-dtc-gate-bd019-target-");
    // Session CWD repo: NOTHING staged (its staged set is empty → bd-010 alone would
    // hit the conservative BLOCKING default).
    // Target repo: an all-non-ontology staged set.
    stage(targetRepo, "second-brain/x.md");
    stage(targetRepo, "_workspace/y.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: sessionRepo,
        tool_name: "Bash",
        tool_input: { command: `git -C ${targetRepo} commit -m wip` },
      },
      true,
      sessionRepo, // gate's projectRoot = session CWD (the WRONG repo without the fix)
    );
    expect(cls).toBe("generic-mutation");
    expect(cls).not.toBe("commit");
  });

  test("git -C <other-repo> commit, target MIXED staged set → commit (blocking)", () => {
    const sessionRepo = initGitRepo("pm-dtc-gate-bd019-session-");
    const targetRepo = initGitRepo("pm-dtc-gate-bd019-target-");
    stage(targetRepo, "schemas/ontology/primitives/foo.ts", "export const FOO = 1;\n");
    stage(targetRepo, "second-brain/x.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: sessionRepo,
        tool_name: "Bash",
        tool_input: { command: `git -C ${targetRepo} commit -m wip` },
      },
      true,
      sessionRepo,
    );
    expect(cls).toBe("commit");
  });

  test("git -C <other-repo> commit, target EMPTY staged set → commit (conservative)", () => {
    const sessionRepo = initGitRepo("pm-dtc-gate-bd019-session-");
    const targetRepo = initGitRepo("pm-dtc-gate-bd019-target-");
    // Session repo has an all-non-ontology staged set; without the `-C` fix the gate
    // would wrongly de-floor off the SESSION repo. With the fix it reads the empty
    // TARGET repo and stays conservative.
    stage(sessionRepo, "second-brain/x.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: sessionRepo,
        tool_name: "Bash",
        tool_input: { command: `git -C ${targetRepo} commit -m wip` },
      },
      true,
      sessionRepo,
    );
    expect(cls).toBe("commit");
  });

  test("git commit with NO -C override resolves the session CWD repo (fallback unchanged)", () => {
    const sessionRepo = initGitRepo("pm-dtc-gate-bd019-session-");
    stage(sessionRepo, "second-brain/x.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      { cwd: sessionRepo, tool_name: "Bash", tool_input: { command: "git commit -m wip" } },
      true,
      sessionRepo,
    );
    expect(cls).toBe("generic-mutation");
  });

  test("git --work-tree <other-repo> commit, target ALL-non-ontology → generic-mutation", () => {
    const sessionRepo = initGitRepo("pm-dtc-gate-bd019-session-");
    const targetRepo = initGitRepo("pm-dtc-gate-bd019-target-");
    stage(targetRepo, "docs/a.md");
    const cls = __test__.protectedMutationClassForPromptGate(
      {
        cwd: sessionRepo,
        tool_name: "Bash",
        tool_input: {
          command: `git --git-dir=${targetRepo}/.git --work-tree=${targetRepo} commit -m wip`,
        },
      },
      true,
      sessionRepo,
    );
    expect(cls).toBe("generic-mutation");
  });

  test("isGitSubcommand tolerates git global options before the subcommand", () => {
    expect(__test__.isGitSubcommand("git commit -m x", "commit")).toBe(true);
    expect(__test__.isGitSubcommand("git -c /repo/other commit -m x", "commit")).toBe(true); // -C lowercased to -c
    expect(__test__.isGitSubcommand("git --git-dir=/gd --work-tree=/wt commit", "commit")).toBe(true);
    expect(__test__.isGitSubcommand("git -c user.name=x commit", "commit")).toBe(true);
    expect(__test__.isGitSubcommand("git --no-pager commit", "commit")).toBe(true);
    expect(__test__.isGitSubcommand("git push origin main", "commit")).toBe(false);
    expect(__test__.isGitSubcommand("git status", "commit")).toBe(false);
    expect(__test__.isGitSubcommand("gh pr create", "commit")).toBe(false);
  });

  test("resolveGitTargetRepo parses -C / --work-tree, falls back to session CWD", () => {
    const root = "/home/u/sess";
    expect(__test__.resolveGitTargetRepo("git commit -m x", root)).toBe(root);
    expect(__test__.resolveGitTargetRepo("git -C /repo/other commit -m x", root)).toBe(
      "/repo/other",
    );
    // relative -C resolves against the session CWD
    expect(__test__.resolveGitTargetRepo("git -C ../sibling commit", root)).toBe(
      path.resolve(root, "../sibling"),
    );
    // --work-tree overrides the working tree
    expect(
      __test__.resolveGitTargetRepo("git --work-tree=/wt --git-dir=/gd commit", root),
    ).toBe("/wt");
  });
});

// bd-017 (push/PR de-floor) — extend bd-010's path-aware classifier from the `commit`
// class to the `release` (git push) and `pull-request` (gh pr) classes. The change set
// is the PUSHED RANGE (upstream..HEAD), not the staged set — a push of already-committed
// work has an EMPTY staged set, so the range resolver is required. all-non-ontology
// range → generic-mutation (de-floored); MIXED / empty / unresolvable range → keep the
// release/pull-request floor (blocking). Header (class floor) and body (scoped-blocking
// predicate) now agree because both key off the same isNonOntologyPath test.
describe("bd-017 path-aware push/PR floor (mutationClass)", () => {
  const repoRoots: string[] = [];

  afterEach(() => {
    for (const r of repoRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  });

  function git(root: string, ...args: string[]): string {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  }

  function writeCommit(root: string, relPath: string, msg: string, content = "x\n"): void {
    const abs = path.join(root, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    git(root, "add", "--", relPath);
    git(root, "commit", "-q", "-m", msg);
  }

  /**
   * A repo with a `base` branch (one commit) and a `feature` branch checked out that
   * is one commit AHEAD of `base`, with `feature` tracking `base` as its upstream so
   * `@{u}` resolves. The ahead commit touches `aheadPath`. Returns the root dir.
   */
  function initRepoWithAhead(aheadPath: string, content = "x\n"): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-push-repo-"));
    repoRoots.push(root);
    git(root, "init", "-q");
    git(root, "config", "user.email", "t@t.test");
    git(root, "config", "user.name", "test");
    git(root, "checkout", "-q", "-b", "base");
    writeCommit(root, "anchor.txt", "base", "v1\n");
    git(root, "checkout", "-q", "-b", "feature");
    writeCommit(root, aheadPath, "ahead", content);
    // Make `base` the tracking upstream of `feature` so `@{u}` resolves.
    git(root, "branch", "--set-upstream-to=base", "feature");
    return root;
  }

  function pushPayload(root: string) {
    return { cwd: root, tool_name: "Bash", tool_input: { command: "git push origin feature" } };
  }
  function prPayload(root: string) {
    return { cwd: root, tool_name: "Bash", tool_input: { command: "gh pr create --fill" } };
  }

  // (1) all-non-ontology push range → de-floored to generic-mutation (advisory).
  test("git push + ALL-non-ontology range → generic-mutation (de-floored)", () => {
    const root = initRepoWithAhead("second-brain/note.md");
    expect(__test__.allPushRangePathsNonOntology(root)).toBe(true);
    const cls = __test__.protectedMutationClassForPromptGate(pushPayload(root), true, root);
    expect(cls).toBe("generic-mutation");
    expect(cls).not.toBe("release");
  });

  // (2) ontology-touching push range → keep release (blocking).
  test("git push + ontology-touching range → release (blocking)", () => {
    const root = initRepoWithAhead("schemas/ontology/primitives/foo.ts", "export const FOO = 1;\n");
    expect(__test__.allPushRangePathsNonOntology(root)).toBe(false);
    const cls = __test__.protectedMutationClassForPromptGate(pushPayload(root), true, root);
    expect(cls).toBe("release");
  });

  // (2b) MIXED push range (one ontology + one non-ontology) → keep release (blocking).
  test("git push + MIXED range → release (blocking)", () => {
    const root = initRepoWithAhead("second-brain/note.md");
    writeCommit(root, "schemas/ontology/primitives/bar.ts", "ahead2", "export const BAR = 2;\n");
    git(root, "branch", "--set-upstream-to=base", "feature");
    expect(__test__.allPushRangePathsNonOntology(root)).toBe(false);
    const cls = __test__.protectedMutationClassForPromptGate(pushPayload(root), true, root);
    expect(cls).toBe("release");
  });

  // (3) unresolvable/empty range → keep release (blocking). A repo with an upstream
  // but NO commits ahead of it has an empty range.
  test("git push + empty range (no commits ahead of upstream) → release (blocking)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-push-empty-"));
    repoRoots.push(root);
    git(root, "init", "-q");
    git(root, "config", "user.email", "t@t.test");
    git(root, "config", "user.name", "test");
    git(root, "checkout", "-q", "-b", "base");
    writeCommit(root, "anchor.txt", "base", "v1\n");
    git(root, "checkout", "-q", "-b", "feature");
    git(root, "branch", "--set-upstream-to=base", "feature");
    expect(__test__.allPushRangePathsNonOntology(root)).toBe(false);
    const cls = __test__.protectedMutationClassForPromptGate(pushPayload(root), true, root);
    expect(cls).toBe("release");
  });

  test("git push in a non-git dir → release (resolver throws → conservative)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-push-nogit-"));
    repoRoots.push(dir);
    expect(__test__.allPushRangePathsNonOntology(dir)).toBe(false);
    const cls = __test__.protectedMutationClassForPromptGate(pushPayload(dir), true, dir);
    expect(cls).toBe("release");
  });

  // (4) PR arm mirrors all three.
  test("gh pr + ALL-non-ontology range → generic-mutation (de-floored)", () => {
    const root = initRepoWithAhead("docs/changelog.md");
    const cls = __test__.protectedMutationClassForPromptGate(prPayload(root), true, root);
    expect(cls).toBe("generic-mutation");
    expect(cls).not.toBe("pull-request");
  });

  test("gh pr + ontology-touching range → pull-request (blocking)", () => {
    const root = initRepoWithAhead("schemas/ontology/primitives/foo.ts", "export const FOO = 1;\n");
    const cls = __test__.protectedMutationClassForPromptGate(prPayload(root), true, root);
    expect(cls).toBe("pull-request");
  });

  test("gh pr + empty/unresolvable range → pull-request (blocking)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-pr-nogit-"));
    repoRoots.push(dir);
    const cls = __test__.protectedMutationClassForPromptGate(prPayload(dir), true, dir);
    expect(cls).toBe("pull-request");
  });

  // resolvePushRangeBaseRef prefers the configured upstream.
  test("resolvePushRangeBaseRef: returns the tracking upstream when configured", () => {
    const root = initRepoWithAhead("second-brain/note.md");
    expect(__test__.resolvePushRangeBaseRef(root)).toBe("base");
  });
});

// G-CLS-D — the delivery classifier must be QUOTE-AWARE: prose living inside a
// quoted argument value (e.g. `--message "ship the release"`) must NOT
// false-positive as a real delivery command, but a real delivery verb the
// executable actually runs — including one hidden inside an interpreter's
// `-c "…"` exec-a-quoted-script idiom — must STILL classify.
describe("G-CLS-D quote-aware delivery classifier", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  function bashPayload(command: string, root: string) {
    return { cwd: root, tool_name: "Bash", tool_input: { command } };
  }

  function freshDir(label: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-dtc-gate-cls-d-${label}-`));
    dirs.push(dir);
    return dir;
  }

  describe("MUST NOT classify — delivery verbs living only inside quoted prose", () => {
    test("decisions:emit ledger-shaped call: quoted --decision/--reasoning prose is not a real delivery", () => {
      const root = freshDir("decisions-emit");
      const command =
        'bun run tools/cartography/decisions-emit.ts --decision "push the release notes to the team" ' +
        '--reasoning "merge governance ledger append, no code delivery"';
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("external-command");
      expect(cls).not.toBe("release");
    });

    test("echo mentioning a gh pr merge inside quotes is not a real PR action", () => {
      const root = freshDir("echo-gh-pr");
      const command = 'echo "reminder: gh pr merge later this week" >> notes.md';
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("external-command");
      expect(cls).not.toBe("pull-request");
    });

    test("git log --grep prose mentioning npm/bun publish is not a real publish", () => {
      const root = freshDir("git-log-grep");
      const command = 'git log --grep "npm publish and bun publish notes"';
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("external-command");
      expect(cls).not.toBe("release");
    });

    test("bun test --test-name-pattern mentioning deploy is not a real deploy", () => {
      const root = freshDir("bun-test-pattern");
      const command = 'bun test --test-name-pattern "deploy the staging bundle notes"';
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("external-command");
      expect(cls).not.toBe("release");
    });
  });

  describe("MUST STILL classify — real delivery commands", () => {
    test("REGRESSION: bare `git push` (no quotes) still classifies as release (blocking)", () => {
      const root = freshDir("bare-push");
      const command = "git push origin main";
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("release");
    });

    test("`bash -c \"git push origin main\"` (inner-script idiom) still classifies as release", () => {
      const root = freshDir("bash-c-push");
      const command = 'bash -c "git push origin main"';
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("release");
    });

    test("REGRESSION: bare `gh pr merge` (no quotes) still classifies as pull-request (blocking)", () => {
      const root = freshDir("bare-gh-pr");
      const command = "gh pr merge 123 --squash";
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("pull-request");
    });

    test("mixed command: quoted prose AND a real unquoted `git push` still classifies as release", () => {
      const root = freshDir("mixed-prose-and-push");
      const command = 'echo "ship this quietly" && git push origin main';
      const cls = __test__.protectedMutationClassForPromptGate(bashPayload(command, root), true, root);
      expect(cls).toBe("release");
    });
  });
});
