// palantir-mini — agent-decision-log hook tests (W1.E sprint-037; recursion filter sprint-060 W1.4)
// Covers: pre/post mode dispatch, rationale gate, advisory vs blocking,
//         Lead-direct exemption, inputDigest computation,
//         recursion filter (4 acceptance-gate cases for P1.LD5/D.10).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Import the two exported handlers directly for unit testing.
// The hook's entry-point is the standalone script (reads stdin, writes stdout),
// but the handlers are also the named exports so tests can call them directly.
// We re-import via the file-level functions since the module has a main() call.
// Use dynamic require pattern to avoid re-executing main().

let handlePreFn: (p: unknown) => Promise<{ message: string; decision?: string; reason?: string; hookSpecificOutput?: Record<string, unknown> }>;
let handlePostFn: (p: unknown) => Promise<{ message: string; decision?: string }>;

// We test by invoking the module functions via a shim that calls the handlers.
// Because agent-decision-log.ts calls void main() at module level (as a Bun script),
// we exercise the handlers through a thin wrapper that re-imports with a mock argv.

const APPLY_EDIT_TOOL   = "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function";
const COMMIT_EDITS_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
const EMIT_EVENT_TOOL   = "mcp__plugin_palantir-mini_palantir-mini__emit_event";

let TMP: string;
let savedBlocking: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-agent-decision-log-"));
  savedBlocking = process.env.PALANTIR_MINI_RATIONALE_BLOCKING;
  delete process.env.PALANTIR_MINI_RATIONALE_BLOCKING;
  // Set PALANTIR_MINI_EVENTS_FILE to a temp file so emit() writes there, not to
  // a live project events.jsonl.
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, "events.jsonl");
  process.env.PALANTIR_MINI_PROJECT = TMP;
});

afterEach(() => {
  if (savedBlocking !== undefined) {
    process.env.PALANTIR_MINI_RATIONALE_BLOCKING = savedBlocking;
  } else {
    delete process.env.PALANTIR_MINI_RATIONALE_BLOCKING;
  }
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helper: build a minimal hook payload. ───────────────────────────────────

function buildPayload(opts: {
  toolName?: string;
  agentName?: string;
  reasoning?: string;
  hypothesis?: string;
  useEnvelope?: boolean;
}) {
  const { toolName = EMIT_EVENT_TOOL, agentName = "implementer", reasoning, hypothesis, useEnvelope = false } = opts;

  const withWhat: Record<string, unknown> = {};
  if (reasoning  !== undefined) withWhat["reasoning"]  = reasoning;
  if (hypothesis !== undefined) withWhat["hypothesis"] = hypothesis;

  const byWhom = { agentName };

  if (useEnvelope) {
    return {
      tool_name: toolName,
      cwd: TMP,
      session_id: "sess-test",
      tool_input: {
        project: TMP,
        envelope: { byWhom, withWhat },
      },
    };
  }

  return {
    tool_name: toolName,
    cwd: TMP,
    session_id: "sess-test",
    tool_input: { project: TMP, byWhom, withWhat },
  };
}

// ─── Inline re-exports: we load the two private functions via a test shim.
// Because agent-decision-log.ts is a standalone script (calls main() at module
// load), we duplicate the handler logic minimally here using the same module
// paths and env vars, and test by spawning the script as a subprocess.

import { spawnSync } from "child_process";

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/agent-decision-log.ts",
);

function runHook(mode: "pre" | "post", payload: unknown): {
  exitCode: number;
  stdout: string;
  stderr: string;
  result: Record<string, unknown> | null;
} {
  const result = spawnSync(
    "bun",
    ["run", HOOK_SCRIPT, mode],
    {
      input: JSON.stringify(payload),
      encoding: "utf8",
      env: { ...process.env },
      timeout: 10_000,
    },
  );
  let parsed: Record<string, unknown> | null = null;
  if (result.stdout && result.stdout.trim().length > 0) {
    try {
      parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    } catch {
      // leave null
    }
  }
  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    result: parsed,
  };
}

// ─── Helper: sha256 of canonical JSON (mirrors hook implementation). ─────────

function sha256Canonical(input: unknown): string {
  const canonical = JSON.stringify(input, Object.keys(input as Record<string, unknown>).sort());
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("agent-decision-log (pre mode)", () => {

  test("1. subagent_with_reasoning — pre passes, post emits agent_decision_logged", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "implementer",
      reasoning: "Emitting sprint_contract_bound event to record harness binding.",
    });

    // Pre: should pass (rationale present)
    const pre = runHook("pre", payload);
    expect(pre.exitCode).toBe(0);
    expect(pre.result?.decision).toBe("continue");
    expect(pre.result?.message).toContain("rationale OK");

    // Post: should emit agent_decision_logged
    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("agent_decision_logged");
    expect(post.result?.message).toContain("implementer");

    // Verify inputDigest is sha256 of tool_input
    const expectedDigest = sha256Canonical(payload.tool_input);
    expect(post.result?.message).toContain(expectedDigest.slice(0, 12));
  });

  test("2. subagent_missing_reasoning_advisory — advisory pre, post still logs", () => {
    // Default mode: no PALANTIR_MINI_RATIONALE_BLOCKING
    const payload = buildPayload({
      toolName:  COMMIT_EDITS_TOOL,
      agentName: "implementer",
      // no reasoning
    });

    // Pre: advisory (decision=continue) + additionalContext set
    const pre = runHook("pre", payload);
    expect(pre.exitCode).toBe(0);
    expect(pre.result?.decision).toBe("continue");
    expect(pre.result?.message).toContain("advisory");
    const preOutput = pre.result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(typeof preOutput?.["additionalContext"]).toBe("string");
    expect((preOutput?.["additionalContext"] as string)).toContain("pm-delegate-or-direct");

    // Post: always emits agent_decision_logged regardless of advisory state
    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("agent_decision_logged");
    // reasoning field will be undefined in log — that's fine (hook does not block post)
  });

  test("3. subagent_missing_reasoning_blocking — PALANTIR_MINI_RATIONALE_BLOCKING=1 → deny", () => {
    const payload = buildPayload({
      toolName:  APPLY_EDIT_TOOL,
      agentName: "implementer",
      // no reasoning
    });

    // Override env for this test
    const envWithBlocking = { ...process.env, PALANTIR_MINI_RATIONALE_BLOCKING: "1" };

    // Pre: should DENY
    const preResult = spawnSync(
      "bun",
      ["run", HOOK_SCRIPT, "pre"],
      { input: JSON.stringify(payload), encoding: "utf8", env: envWithBlocking, timeout: 10_000 },
    );
    expect(preResult.status).toBe(0);
    const preParsed = JSON.parse(preResult.stdout.trim()) as Record<string, unknown>;
    expect(preParsed["decision"]).toBe("block");
    expect(preParsed["message"]).toContain("BLOCK");
    const preOutput = preParsed["hookSpecificOutput"] as Record<string, unknown>;
    expect(preOutput["permissionDecision"]).toBe("deny");
    expect((preOutput["permissionDecisionReason"] as string)).toContain("PALANTIR_MINI_RATIONALE_BLOCKING=0");
  });

  test("4. lead_no_reasoning_passes — agentName=claude-code is exempt", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "claude-code",
      // no reasoning — Lead-direct exempt
    });

    // Pre: passes (Lead exempt)
    const pre = runHook("pre", payload);
    expect(pre.exitCode).toBe(0);
    expect(pre.result?.decision).toBe("continue");
    expect(pre.result?.message).toContain("exempt");

    // Post: recursion filter applies — Lead + emit_event is suppressed (sprint-060 W1.4).
    // Message contains "recursion_filter_applied" and the agent name, NOT "agent_decision_logged emitted".
    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("claude-code");
    expect(post.result?.message).toContain("recursion_filter_applied");
  });

  test("5. skips when tool_name is not in decision-log set", () => {
    const payload = buildPayload({ toolName: "Bash" });
    const pre  = runHook("pre",  payload);
    const post = runHook("post", payload);
    expect(pre.result?.decision).toBe("continue");
    expect(pre.result?.message).toContain("skipped");
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("skipped");
  });

  test("6. handles null payload gracefully (no crash)", () => {
    // spawnSync with empty stdin
    const preResult = spawnSync(
      "bun",
      ["run", HOOK_SCRIPT, "pre"],
      { input: "", encoding: "utf8", env: { ...process.env }, timeout: 10_000 },
    );
    expect(preResult.status).toBe(0);

    const postResult = spawnSync(
      "bun",
      ["run", HOOK_SCRIPT, "post"],
      { input: "", encoding: "utf8", env: { ...process.env }, timeout: 10_000 },
    );
    expect(postResult.status).toBe(0);
  });

  test("7. envelope-nested byWhom/withWhat is extracted correctly", () => {
    // emit_event uses envelope pattern
    const payload = buildPayload({
      toolName:   EMIT_EVENT_TOOL,
      agentName:  "harness-generator",
      reasoning:  "Applying edits from dry-run proposal batch.",
      useEnvelope: true,
    });

    const pre = runHook("pre", payload);
    expect(pre.result?.decision).toBe("continue");
    expect(pre.result?.message).toContain("rationale OK");
    expect(pre.result?.message).toContain("harness-generator");

    const post = runHook("post", payload);
    expect(post.result?.message).toContain("harness-generator");
  });

});

// ─── Recursion-filter test suite (sprint-060 W1.4, closes P1.LD5/D.10) ───────
//
// Acceptance gates:
//   R1.  Lead (claude-code) calls emit_event → filtered (recursion loop suppressed)
//   R1b. Lead prefix (lead-*) calls emit_event → filtered
//   R2.  Researcher calls emit_event → kept (not Lead-tier)
//   R3.  Lead calls commit_edits → kept (not emit_event)
//   R4.  Implementer calls emit_event → kept (agentName does not match Lead pattern)
//   R5.  Filter counter increments on each suppression (1h sliding window)

describe("agent-decision-log (post mode) — recursion filter (P1.LD5/D.10)", () => {

  test("R1. lead_emit_event_filtered — claude-code calling emit_event is suppressed", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "claude-code",
      reasoning: "Emitting sprint_contract_bound event.",
    });

    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("recursion_filter_applied");
    expect(post.result?.message).not.toContain("agent_decision_logged emitted");
    expect(post.result?.message).toContain("claude-code");
  });

  test("R1b. lead_prefix_emit_event_filtered — lead-* prefix is suppressed", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "lead-opus[1m]",
      reasoning: "Lead opus emitting phase_completed event.",
    });

    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("recursion_filter_applied");
    expect(post.result?.message).toContain("lead-opus[1m]");
    expect(post.result?.message).not.toContain("agent_decision_logged emitted");
  });

  test("R2. researcher_emit_event_kept — non-Lead intentional emit is logged", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "researcher",
      reasoning: "Logging research finding into events substrate.",
    });

    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("agent_decision_logged");
    expect(post.result?.message).not.toContain("recursion_filter_applied");
    expect(post.result?.message).toContain("researcher");
  });

  test("R3. lead_commit_edits_kept — Lead using non-emit_event tool is logged", () => {
    const payload = buildPayload({
      toolName:  COMMIT_EDITS_TOOL,
      agentName: "claude-code",
      reasoning: "Committing dry-run approved edits.",
    });

    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("agent_decision_logged");
    expect(post.result?.message).not.toContain("recursion_filter_applied");
  });

  test("R4. implementer_emit_event_kept — implementer calling emit_event is logged", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "implementer",
      reasoning: "Emitting validation_phase_completed for completed code edit.",
    });

    const post = runHook("post", payload);
    expect(post.exitCode).toBe(0);
    expect(post.result?.decision).toBe("continue");
    expect(post.result?.message).toContain("agent_decision_logged");
    expect(post.result?.message).not.toContain("recursion_filter_applied");
    expect(post.result?.message).toContain("implementer");
  });

  test("R5. recursion_filter_count_increments — 1h window count reported in message", () => {
    const payload = buildPayload({
      toolName:  EMIT_EVENT_TOOL,
      agentName: "claude-code",
    });

    const post1 = runHook("post", payload);
    const post2 = runHook("post", payload);

    expect(post1.result?.message).toContain("recursion_filter_applied");
    expect(post2.result?.message).toContain("recursion_filter_applied");

    const m1 = (post1.result?.message as string)?.match(/1h window count=(\d+)/);
    const m2 = (post2.result?.message as string)?.match(/1h window count=(\d+)/);
    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    const c1 = parseInt(m1![1]!, 10);
    const c2 = parseInt(m2![1]!, 10);
    expect(c2).toBeGreaterThan(c1);
  });

});
