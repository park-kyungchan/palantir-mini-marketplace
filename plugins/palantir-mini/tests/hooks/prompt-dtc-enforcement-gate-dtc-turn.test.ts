/**
 * prompt-dtc-enforcement-gate-dtc-turn.test.ts
 *
 * Sprint-097 W5-B (dtc-T5-hooks-gate-default-on): Tests for default-on
 * Prompt-DTC gate behavior, including the stronger effective minimum policy.
 *
 * Plan §13.1 W5 acceptance criteria:
 * - Default-on behavior: no env → ontology/protected tool + no DTC → BLOCKS
 * - Default-on with SIC cache hit alone: no env + SIC within 60min → still BLOCKS protected mutation without approved DTC
 * - Bypass envvar: PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 → cannot bypass protected mutation minimums
 * - Mode override: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=advisory → advisory only
 * - Mode override: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off → cannot bypass protected mutation minimums
 * - Mode override: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=blocking → blocks ALL mutating tools
 * - Non-mutating/read-only tools (Read, Grep, Glob, pm_rule_query) → not gated in default mode
 * - DTC turn path (ontology_context_query write-mode via DTC fill) → evaluates correctly
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import {
  recordSicApproval,
  invalidateSicApprovalMemoryCache,
  SIC_CACHE_TTL_MS,
} from "../../lib/prompt-front-door/sic-approval-cache";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

const SAVED_ENV_KEYS = [
  "PALANTIR_MINI_PROMPT_DTC_GATE_MODE",
  "PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS",
  "PALANTIR_MINI_EVENTS_FILE",
  "PALANTIR_MINI_PROJECT",
  "PALANTIR_MINI_GLOBAL_STATE_DIR",
] as const;

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-dtc-turn-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{\"name\":\"dtc-gate-dtc-turn-test\"}\n");
  return dir;
}

function makeTmpGlobalStateDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dtc-gate-dtc-turn-global-"));
  tmpDirs.push(dir);
  return dir;
}

function makePayload(project: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: project,
    session_id: "session-dtc-turn-test",
    tool_name: "Edit",
    tool_input: { file_path: "src/example.ts" },
    ...overrides,
  };
}

function readEvents(project: string): Array<{
  type: string;
  payload?: Record<string, unknown>;
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
  for (const key of SAVED_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir();
});

afterEach(() => {
  for (const key of SAVED_ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  for (const dir of tmpDirs.splice(0)) {
    invalidateSicApprovalMemoryCache(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("prompt-dtc-enforcement-gate: default-on effective policy", () => {
  // ── §9.2 Default-on behavior ──────────────────────────────────────────────

  test("default-on: no env var set + ontology-affecting tool (commit_edits) + no SIC approval → BLOCKS", async () => {
    const project = makeTmpProject();
    // No env var set: default request starts at selective-blocking, then
    // protected commit mutations strengthen to blocking.

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("BLOCKING");
    expect(result.reason).toContain("No current prompt-front-door envelope");
  });

  test("default-on: no env var set + ontology-affecting tool (apply_edit_function) + no SIC approval → BLOCKS", async () => {
    const project = makeTmpProject();

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("default-on: no env var set + SIC approval within 60min → still blocks protected mutation without DTC", async () => {
    const project = makeTmpProject();
    const promptId = "test-dtc-turn-default-on-cache-hit";

    // Record a fresh SIC approval in the cache
    recordSicApproval(project, promptId, "user:approved:dtc-turn-test");

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        tool_input: { promptId },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("BLOCKING");
    expect(result.reason).toContain("No current prompt-front-door envelope");
  });

  test("default-on: generic Edit mutation → scoped advisory without protected scope", async () => {
    const project = makeTmpProject();
    // Generic mutations strengthen to scoped-blocking, but ordinary files are
    // advisory until they touch scoped protected surfaces.

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "Edit",
        tool_input: { file_path: "src/foo.ts" },
      }),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
    expect(result.additionalContext).toContain("Scoped blocking surface: none");
  });

  // ── §9.4 Bypass envvar ────────────────────────────────────────────────────

  test("bypass envvar: PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 → cannot bypass protected mutation minimums", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS = "1";
    // Default requested mode strengthens to blocking for commit_edits.

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.message).toBe("palantir-mini: prompt-DTC gate BLOCKED");
    expect(result.reason).toContain("BLOCKING");

    const events = readEvents(project);
    const bypassEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload?.errorClass === "prompt_dtc_gate_off_bypass",
    );
    expect(bypassEvent).toBeUndefined();
  });

  // ── Mode overrides ────────────────────────────────────────────────────────

  test("mode override: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=advisory → advisory only (no block)", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "advisory";
    // No prompt set up; advisory mode reports pending DTC

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "Edit",
        tool_input: { file_path: "src/example.ts" },
      }),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
  });

  test("mode override: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off → cannot bypass protected mutation minimums", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "off";

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.message).toBe("palantir-mini: prompt-DTC gate BLOCKED");
    expect(result.reason).toContain("BLOCKING");
    const bypassEvent = readEvents(project).find(
      (e) => e.payload?.errorClass === "prompt_dtc_gate_off_bypass",
    );
    expect(bypassEvent).toBeUndefined();
  });

  test("mode override: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=blocking → blocks ALL mutating Edit (not just ontology-affecting subset)", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    // Edit is not in the 4-tool ONTOLOGY_AFFECTING_TOOLS set, but blocking mode gates all mutating

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "Edit",
        tool_input: { file_path: "src/foo.ts" },
      }),
    );

    // In blocking mode, Edit is a mutating candidate → should block (no DTC approval)
    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  // ── Non-ontology tools pass through ──────────────────────────────────────

  test("non-ontology tools: Read → not gated in selective-blocking default mode", async () => {
    const project = makeTmpProject();
    // Default = selective-blocking; Read is read-only

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "Read",
        tool_input: { file_path: "src/foo.ts" },
      }),
    );

    // Read is not a mutating candidate → skipped
    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("skipped");
  });

  test("non-ontology tools: Glob → not gated in selective-blocking default mode", async () => {
    const project = makeTmpProject();

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "Glob",
        tool_input: { pattern: "**/*.ts" },
      }),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("skipped");
  });

  test("non-ontology MCP tool: impact_query → not gated in selective-blocking default mode", async () => {
    const project = makeTmpProject();

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__impact_query",
      }),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("not ontology-affecting");
  });

  test("non-ontology MCP tool: pm_rule_query → not gated in selective-blocking default mode", async () => {
    const project = makeTmpProject();

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__pm_rule_query",
      }),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("not ontology-affecting");
  });

  // ── DTC turn path ─────────────────────────────────────────────────────────

  test("DTC turn path: ontology_context_query write-mode action → gated in default selective-blocking", async () => {
    const project = makeTmpProject();
    // Default = selective-blocking; ontology_context_query with write action is a mutation

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
        tool_input: { action: "write", scope: "test-ontology" },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("BLOCKING");
  });

  test("DTC turn path: ontology_context_query read-only (no action) → passes through in default selective-blocking", async () => {
    const project = makeTmpProject();

    const result = await promptDtcEnforcementGate(
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
        tool_input: { scope: "test-ontology" },
      }),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("read-only or allowed");
  });

  // negotiate_sprint_contract, compute_edits_dry_run, grade_outcome_with_rubric tests removed
  // in Wave 2G rationalization — these tools were cut in Wave 2D/2E and are no longer registered.

  // ── SIC approval expiry edge case ─────────────────────────────────────────

  test("default-on: SIC approval 61+ min ago → expired → blocks (cache miss)", async () => {
    const project = makeTmpProject();
    const promptId = "test-dtc-turn-expired-cache";

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
      makePayload(project, {
        tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
        tool_input: { promptId },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
  });
});
