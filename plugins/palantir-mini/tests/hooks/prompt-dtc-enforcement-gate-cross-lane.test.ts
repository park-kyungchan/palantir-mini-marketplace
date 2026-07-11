// palantir-mini pm authorization-flexibility slice 2 — G-ENV-A cross-lane
// envelope/grant resolution (global session-scoped index).
//
// Verifies hooks/gates/prompt-dtc-enforcement-gate.impl.ts's readCurrentEnvelope
// GLOBAL fallback: when the local per-project lookup misses, the gate consults
// the global session index (lib/prompt-front-door/global-session-index.ts) for
// (runtime, sessionId) and, on a redirect to a DIFFERENT project root, resolves
// the envelope (and its SIC/DTC contract records) from THAT root's local store.
//
// Every test sets PALANTIR_MINI_GLOBAL_STATE_DIR to a per-test temp directory so
// the global index never reads or writes the real user home (hard hermeticity
// requirement for this slice).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import promptFrontDoorCapture from "../../hooks/prompt-front-door-capture";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
} from "../../lib/prompt-front-door";
import { writeGlobalSessionPointerSync } from "../../lib/prompt-front-door/global-session-index";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `prompt-dtc-gate-cross-lane-${label}-`));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{\"name\":\"prompt-dtc-gate-cross-lane-test\"}\n");
  return dir;
}

function makeTmpGlobalStateDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-global-state-${label}-`));
  tmpDirs.push(dir);
  return dir;
}

function semanticContract(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:approved:cross-lane",
    status: "approved",
    rawIntent: "Add prompt-DTC enforcement gates",
    confirmedIntent: "Gate mutating tools until prompt-local DTC approval exists.",
    nonGoals: ["Do not promote schemas in this slice."],
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
    approvedCanonicalTermRefs: ["term:cross-lane"],
    approvedTermMappingRefs: ["mapping:cross-lane"],
    semanticConsistencyResultRef: "semantic-resolver-run:cross-lane",
    approvalRef: "user:approved:cross-lane",
    ...overrides,
  };
}

function digitalTwinContract(
  semanticRef = "semantic-intent:approved:cross-lane",
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin-change:approved:cross-lane",
    status: "approved",
    semanticIntentContractRef: semanticRef,
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
      ".claude/plugins/palantir-mini/hooks/hooks.json",
    ],
    changeBoundary: "Plugin-local PreToolUse prompt-DTC enforcement only.",
    branchProposalPolicy: "Ship after cross-lane slice lands.",
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
    semanticConsistencyRefs: ["semantic-resolver-run:cross-lane"],
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-07-12T00:00:00.000Z",
      source: "agent" as const,
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: [],
      linkTypeRefs: [],
      actionTypeRefs: [],
      functionRefs: [],
      applicationStateRefs: [],
      evaluationRefs: ["project://palantir-mini/validation-pack/prompt-dtc-gate"],
      semanticTermRefs: ["semantic-resolver-run:cross-lane"],
      nonApplicablePrimitiveKinds: [
        "ObjectType",
        "LinkType",
        "ActionType",
        "Function",
        "ApplicationState",
      ],
      nonApplicableEvidenceRefs: ["test://cross-lane-non-applicable"],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    requiredUserDecisions: [{
      decisionId: "decision-technology-review",
      domain: "TECHNOLOGY",
      label: "Technology review closed for cross-lane hook tests",
      status: "approved",
      blocking: true,
      evidenceRefs: ["test://technology-review"],
      approvalRef: "user:approved:technology-review",
    }],
    approvalRef: "user:approved:cross-lane",
    ...overrides,
  };
}

async function approvedPrompt(project: string, sessionId: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt: "Implement cross-lane prompt-DTC enforcement gates.",
    sessionId,
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-07-12T04:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  const semanticRecord = await store.writeContractRecord(
    envelope,
    "semantic-intent",
    semanticContract(),
  );
  const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
    semanticIntentContractRef: semanticRecord.ref,
  });
  const semanticApproved = transitionPromptEnvelope(semanticDrafted, "semantic_intent_approved", {
    approvalRef: "user:approved:cross-lane",
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
    { approvalRef: "user:approved:cross-lane" },
  );
  await store.saveEnvelope(digitalTwinApproved);
  return { store, envelope: digitalTwinApproved };
}

function payload(project: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: project,
    session_id: "session-cross-lane",
    tool_name: "Edit",
    tool_input: {
      file_path: ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
    },
    ...overrides,
  };
}

const ENV_KEYS = [
  "PALANTIR_MINI_PROMPT_DTC_GATE_MODE",
  "PALANTIR_MINI_EVENTS_FILE",
  "PALANTIR_MINI_PROJECT",
  "PALANTIR_MINI_GLOBAL_STATE_DIR",
  "PALANTIR_MINI_HOST_RUNTIME",
] as const;

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("prompt-dtc-enforcement-gate cross-lane (G-ENV-A global session index)", () => {
  test("(i) cross-lane regression: gate resolves the envelope from a redirected project root", async () => {
    const projectA = makeTmpProject("a");
    const projectB = makeTmpProject("b");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("i");
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    const { envelope } = await approvedPrompt(projectA, "session-cross-lane");
    writeGlobalSessionPointerSync(envelope.runtime, envelope.sessionId, projectA);

    const result = await promptDtcEnforcementGate(
      payload(projectB, {
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
  });

  test("(ii) local-hit precedence: a mismatched global pointer is not consulted when the local store hits", async () => {
    const projectA = makeTmpProject("a");
    const projectC = makeTmpProject("c"); // exists, but has no envelope for this session
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("ii");
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    const { envelope } = await approvedPrompt(projectA, "session-cross-lane");
    // Poisoned pointer: same (runtime, sessionId) key, but redirects to a root
    // with no envelope. If the gate incorrectly preferred the global index over
    // a local hit, this would misresolve; the local store at projectA must win.
    writeGlobalSessionPointerSync(envelope.runtime, envelope.sessionId, projectC);

    const result = await promptDtcEnforcementGate(
      payload(projectA, {
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
  });

  test("(iii) global-write failure leaves local capture success intact", async () => {
    const project = makeTmpProject("capture");
    const globalBase = makeTmpGlobalStateDir("iii");
    // Block the global index's directory creation: put a FILE where the code
    // needs to mkdir a directory (base/.palantir-mini/...).
    fs.writeFileSync(path.join(globalBase, ".palantir-mini"), "not a directory");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = globalBase;
    process.env.PALANTIR_MINI_PROJECT = project;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(
      project,
      ".palantir-mini",
      "session",
      "events.jsonl",
    );
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const result = await promptFrontDoorCapture({
      session_id: "session-global-write-failure",
      cwd: project,
      prompt: "Implement cross-lane capture with a poisoned global index path.",
      hook_event_name: "UserPromptSubmit",
    });

    expect(result.message).toContain("prompt-front-door-capture stored");

    const store = new PromptFrontDoorStore({ projectRoot: project });
    const pointer = await store.readCurrentPointer("codex", "session-global-write-failure");
    expect(pointer).not.toBeNull();
    const storedEnvelope = await store.readEnvelope(
      "session-global-write-failure",
      pointer!.promptId,
    );
    expect(storedEnvelope).not.toBeNull();
  });

  test("(iv) fallback fails closed when the redirect target has no envelope", async () => {
    const projectB = makeTmpProject("b");
    const projectC = makeTmpProject("c"); // exists, but nothing was ever captured here
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("iv");
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    writeGlobalSessionPointerSync("codex", "session-cross-lane", projectC);

    const result = await promptDtcEnforcementGate(payload(projectB));

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("No current prompt-front-door envelope");
  });
});
