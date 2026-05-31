// palantir-mini PR-13 — commit-edits-governance hook tests
// Table-driven fixtures covering the merged hook's gate sequence.
//
// Note: commit-edits-governance.ts calls `void main()` at module level (standalone
// Bun script pattern). Tests invoke it via spawnSync to avoid stdin-hang on import.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
} from "../../lib/prompt-front-door";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";

const COMMIT_EDITS_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/commit-edits-governance.ts",
);

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-governance-"));
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

/** Run the hook script as a subprocess and return structured output. */
function runHook(
  payload: unknown,
  env: Record<string, string> = {},
): { exitCode: number; stdout: string; stderr: string; result: Record<string, unknown> | null } {
  return runHookRaw(JSON.stringify(payload), env);
}

function runHookRaw(
  input: string,
  env: Record<string, string> = {},
): { exitCode: number; stdout: string; stderr: string; result: Record<string, unknown> | null } {
  // Build clean env: inherit process.env but strip bypass vars so tests exercise real gate logic.
  const cleanEnv = { ...process.env };
  delete cleanEnv.PALANTIR_MINI_HARNESS_BYPASS;
  delete cleanEnv.PALANTIR_MINI_AUTO_SPRINT_DISABLE;
  const spawnResult = spawnSync("bun", ["run", HOOK_SCRIPT], {
    input,
    encoding: "utf8",
    env: { ...cleanEnv, PALANTIR_MINI_EVENTS_FILE: path.join(TMP, "events.jsonl"), ...env },
    timeout: 15_000,
  });
  let result: Record<string, unknown> | null = null;
  try {
    if (spawnResult.stdout.trim().length > 0) {
      result = JSON.parse(spawnResult.stdout.trim()) as Record<string, unknown>;
    }
  } catch { /* best-effort */ }
  return {
    exitCode: spawnResult.status ?? 1,
    stdout: spawnResult.stdout,
    stderr: spawnResult.stderr,
    result,
  };
}

/** Create a minimal bound Sprint contract. */
function createBoundContract(sprintId = "sprint-001-quick", mode = "quick"): void {
  const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", sprintId);
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.writeFileSync(path.join(sprintDir, "contract.json"),
    JSON.stringify({ status: "bound", mode }));
}

function semanticContract(): SemanticIntentContract {
  return {
    contractId: "semantic-intent:commit-governance-test",
    status: "approved",
    rawIntent: "Commit plugin governance edits",
    confirmedIntent: "Commit plugin governance edits after DTC approval.",
    nonGoals: [],
    approvedNouns: ["FDEGovernancePolicy"],
    approvedVerbs: ["commit"],
    affectedSurfaces: ["hooks/**", "lib/governance/**"],
    permissionsAndProposal: "Approved plugin governance test boundary.",
    acceptedRisks: [],
    downstreamAllowed: ["commit_edits"],
    downstreamForbidden: [],
    clarificationQuestions: [],
    approvalRef: "user:approved:commit-governance-test",
  };
}

function digitalTwinContract(semanticRef: string): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:commit-governance-test",
    status: "approved",
    semanticIntentContractRef: semanticRef,
    affectedSurfaces: ["hooks/**", "lib/governance/**"],
    changeBoundary: "Plugin governance commit-edits path.",
    branchProposalPolicy: "normal PR",
    permissionBoundary: "plugin local",
    replayMigrationPlan: "none",
    observabilityPlan: "emit governance decision",
    toolSurfaceReadiness: "Claude and Codex MCP spellings",
    evaluationPlan: "targeted hook tests",
    risks: [],
    requiredUserDecisions: [{
      decisionId: "decision-governance-review",
      domain: "GOVERNANCE",
      label: "Governance review closed for commit_edits",
      status: "approved",
      blocking: true,
      evidenceRefs: ["test://governance-review"],
      approvalRef: "user:approved:governance-review",
    }],
    approvalRef: "user:approved:commit-governance-test",
  };
}

async function approvedPrompt(): Promise<{
  readonly promptId: string;
  readonly promptHash: string;
  readonly sessionId: string;
  readonly runtime: string;
}> {
  const store = new PromptFrontDoorStore({ projectRoot: TMP });
  const envelope = createPromptEnvelope({
    rawPrompt: "Commit governance edits.",
    sessionId: "session-commit-governance",
    runtime: "codex",
    projectRoot: TMP,
    capturedAt: "2026-05-21T00:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  const semanticRecord = await store.writeContractRecord(envelope, "semantic-intent", semanticContract());
  const semanticApproved = transitionPromptEnvelope(
    transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
      semanticIntentContractRef: semanticRecord.ref,
    }),
    "semantic_intent_approved",
    { approvalRef: "user:approved:commit-governance-test" },
  );
  const digitalTwinRecord = await store.writeContractRecord(
    semanticApproved,
    "digital-twin-change",
    digitalTwinContract(semanticRecord.ref),
  );
  const digitalTwinApproved = transitionPromptEnvelope(
    transitionPromptEnvelope(semanticApproved, "digital_twin_drafted", {
      digitalTwinChangeContractRef: digitalTwinRecord.ref,
    }),
    "digital_twin_approved",
    { approvalRef: "user:approved:commit-governance-test" },
  );
  await store.saveEnvelope(digitalTwinApproved);
  return {
    promptId: digitalTwinApproved.promptId,
    promptHash: digitalTwinApproved.promptHash,
    sessionId: digitalTwinApproved.sessionId,
    runtime: digitalTwinApproved.runtime,
  };
}

describe("commitEditsGovernance — bypass", () => {
  test("blocks PALANTIR_MINI_HARNESS_BYPASS=1 for strengthen-only commit policy", () => {
    createBoundContract("sprint-001-quick", "quick");
    const { result } = runHook(
      { tool_name: COMMIT_EDITS_TOOL, cwd: TMP, tool_input: { project: TMP } },
      { PALANTIR_MINI_HARNESS_BYPASS: "1" },
    );
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("project_gate_policy_env_bypass_denied");
  });

  test("denied bypass writes an audit event before blocking", () => {
    createBoundContract("sprint-001-quick", "quick");
    const { result } = runHook(
      { tool_name: COMMIT_EDITS_TOOL, cwd: TMP, tool_input: { project: TMP } },
      { PALANTIR_MINI_HARNESS_BYPASS: "1" },
    );
    expect(result?.decision).toBe("block");
    const eventsPath = path.join(TMP, "events.jsonl");
    const events = fs
      .readFileSync(eventsPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { payload?: { errorClass?: string } });
    expect(events.some((event) => event.payload?.errorClass === "project_gate_policy_env_bypass_denied")).toBe(true);
  });
});

describe("commitEditsGovernance — fail-closed script entrypoint", () => {
  test("BLOCKS invalid stdin instead of skipping", () => {
    const { exitCode, result, stderr } = runHookRaw("{ not valid json");
    expect(exitCode).toBe(0);
    expect(stderr).toContain("stdin is not valid JSON");
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("invalid-stdin");
    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(output?.permissionDecision).toBe("deny");
  });

  test("BLOCKS unhandled exceptions instead of continuing", () => {
    const { exitCode, result, stderr } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: { invalid: true },
      tool_input: { edits: [] },
    });
    expect(exitCode).toBe(0);
    expect(stderr).toContain("failed closed on unhandled error");
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("unhandled-exception");
    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(output?.permissionDecision).toBe("deny");
  });
});

describe("commitEditsGovernance — harness gate", () => {
  test("BLOCKS with no-harness-dir when .palantir-mini exists but no harness/", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini"), { recursive: true });
    const { result } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, edits: [] },
    });
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("no-harness-dir");
    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(output?.permissionDecision).toBe("deny");
  });

  test("BLOCKS with no-bound-contract when harness dir present but no bound contract", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001"), { recursive: true });
    fs.writeFileSync(
      path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001", "contract.json"),
      JSON.stringify({ status: "drafting" }),
    );
    const { result } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, edits: [] },
    });
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("no-bound-contract");
    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(output?.permissionDecision).toBe("deny");
  });

  test("BLOCKS quick-sprint path without approved DTC", () => {
    createBoundContract("sprint-001-quick", "quick");
    const { result } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, edits: [] },
    });
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("prompt_front_door_missing");
  });

  test("ALLOWS via quick-sprint path when bound contract mode=quick and DTC is approved", async () => {
    createBoundContract("sprint-001-quick", "quick");
    const prompt = await approvedPrompt();
    const { result } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      session_id: prompt.sessionId,
      tool_input: { project: TMP, edits: [], ...prompt },
    });
    expect(result?.decision).toBe("continue");
    expect(String(result?.message)).toContain("OK");
    expect(String(result?.message)).toContain("quick-sprint-inline-graded");
  });

  test("BLOCKS grace-period full-mode contract without approved DTC", () => {
    createBoundContract("sprint-001", "full");
    // No events.jsonl → grace period active (dry-run pipeline not yet in use).
    const { result } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, edits: [] },
    });
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("prompt_front_door_missing");
  });

  test("BLOCKS on missing-dry-run-ref after dry_run_computed was emitted", async () => {
    createBoundContract("sprint-001", "full");
    const prompt = await approvedPrompt();
    // Write a dry_run_computed event to the path PALANTIR_MINI_EVENTS_FILE points to.
    // eventsPathFor() in the subprocess checks PALANTIR_MINI_EVENTS_FILE first.
    const eventsPath = path.join(TMP, "events.jsonl");
    fs.writeFileSync(eventsPath, JSON.stringify({
      type: "validation_phase_completed",
      when: new Date().toISOString(),
      atopWhich: { commitSha: "test" },
      throughWhich: { sessionId: "test-session", toolName: "compute_edits_dry_run", cwd: TMP },
      byWhom: { agentName: "test", identity: "claude-code" },
      payload: { errorClass: "dry_run_computed" },
      withWhat: { reasoning: "dryRunRef=test-ref-123 compute completed" },
    }) + "\n");
    const { result } = runHook({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      session_id: prompt.sessionId,
      tool_input: { project: TMP, edits: [], ...prompt }, // no dryRunRef → should block
    });
    expect(result?.decision).toBe("block");
    expect(String(result?.message)).toContain("missing-dry-run-ref");
  });
});
