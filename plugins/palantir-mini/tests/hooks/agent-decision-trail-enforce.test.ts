// palantir-mini — agent-decision-trail-enforce hook tests (PR 5.6 sprint-117)
//
// Acceptance gates:
//   T1. Lead-direct (agentName="claude-code") → no-op (exempt)
//   T2. Subagent with paired agent_decision_logged in last 30s → no advisory
//   T3. Subagent without paired agent_decision_logged → advisory emitted; not blocking
//   T4. 5 strikes accumulated → 6th call blocks with permissionDecision="deny"
//   T5. PALANTIR_MINI_DECISION_AUDIT_BYPASS=1 → no advisory, no block

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { spawnSync } from "child_process";

// ─── Constants ───────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/agent-decision-trail-enforce.ts",
);

const APPLY_EDIT_TOOL   = "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function";
const COMMIT_EDITS_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
const EMIT_EVENT_TOOL   = "mcp__plugin_palantir-mini_palantir-mini__emit_event";

const CORRELATION_ID    = "test-corr-id-abc123";

// ─── Temp dir + env setup ─────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-trail-enforce-"));
  // Create the minimal session directory
  const sessionDir = path.join(TMP, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });

  // Wire env so emit() writes to temp file, not live project
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(sessionDir, "events.jsonl");
  process.env.PALANTIR_MINI_PROJECT     = TMP;

  // Set correlationId via env-direct so tests don't need per-agent marker files
  process.env.PALANTIR_MINI_CORRELATION_ID = CORRELATION_ID;

  // Clear bypass
  delete process.env.PALANTIR_MINI_DECISION_AUDIT_BYPASS;
  delete process.env.PALANTIR_MINI_DECISION_AUDIT_RESET;
  delete process.env.PALANTIR_MINI_RATIONALE_BLOCKING;
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_CORRELATION_ID;
  delete process.env.PALANTIR_MINI_DECISION_AUDIT_BYPASS;
  delete process.env.PALANTIR_MINI_DECISION_AUDIT_RESET;
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runHook(
  payload: unknown,
  extraEnv: Record<string, string> = {},
): {
  exitCode: number;
  stdout: string;
  stderr: string;
  result: Record<string, unknown> | null;
} {
  const envWithTmp = { ...process.env, ...extraEnv };
  const res = spawnSync("bun", ["run", HOOK_SCRIPT], {
    input:    JSON.stringify(payload),
    encoding: "utf8",
    env:      envWithTmp,
    timeout:  15_000,
  });
  let parsed: Record<string, unknown> | null = null;
  if (res.stdout?.trim().length > 0) {
    try {
      parsed = JSON.parse(res.stdout.trim()) as Record<string, unknown>;
    } catch { /* leave null */ }
  }
  return { exitCode: res.status ?? 0, stdout: res.stdout ?? "", stderr: res.stderr ?? "", result: parsed };
}

function buildPayload(opts: {
  toolName?: string;
  agentName?: string;
  cwd?: string;
  sessionId?: string;
}) {
  const { toolName = APPLY_EDIT_TOOL, agentName = "implementer", cwd = TMP, sessionId = "sess-test" } = opts;
  return {
    tool_name:  toolName,
    cwd,
    session_id: sessionId,
    tool_input: {
      project:  cwd,
      byWhom:   { agentName },
      withWhat: { reasoning: "Applying edits per sprint plan." },
    },
  };
}

/**
 * Write a fake agent_decision_logged event to events.jsonl
 * so hasRecentDecisionLog() finds a match.
 */
function writeFakeDecisionLogEvent(correlationId: string, sessionDir?: string): void {
  const dir   = sessionDir ?? path.join(TMP, ".palantir-mini", "session");
  const fpath = path.join(dir, "events.jsonl");
  const event = {
    sequence:    1,
    type:        "validation_phase_completed",
    when:        new Date().toISOString(),
    byWhom:      { agentName: "implementer", identity: "claude-code" },
    withWhat:    { reasoning: "test decision log event" },
    atopWhich:   "abc0000",
    throughWhich: { surface: "PostToolUse", tool: "emit_event" },
    payload:     {
      errorClass:    "agent_decision_logged",
      correlationId,
      agentName:     "implementer",
      toolName:      "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
      inputDigest:   "deadbeef1234",
    },
  };
  fs.appendFileSync(fpath, JSON.stringify(event) + "\n", "utf8");
}

/**
 * Write the strike file with an arbitrary count to simulate accumulated strikes.
 */
function writeStrikes(count: number, sessionId = "sess-test"): void {
  const fpath = path.join(TMP, ".palantir-mini", "session", "decision-audit-strikes.json");
  fs.writeFileSync(fpath, JSON.stringify({ count, sessionId, lastMiss: new Date().toISOString() }), "utf8");
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("agent-decision-trail-enforce", () => {

  test("T1. Lead-direct (agentName=claude-code) is exempt — no advisory", () => {
    const payload = buildPayload({ toolName: APPLY_EDIT_TOOL, agentName: "claude-code" });
    const { exitCode, result } = runHook(payload);
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("exempt");
    // No permissionDecision field
    expect((result?.hookSpecificOutput as Record<string, unknown> | undefined)?.permissionDecision).toBeUndefined();
  });

  test("T1b. lead-* prefix is also exempt", () => {
    const payload = buildPayload({ toolName: COMMIT_EDITS_TOOL, agentName: "lead-opus[1m]" });
    const { exitCode, result } = runHook(payload);
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("exempt");
  });

  test("T2. Matched agent_decision_logged in last 30s → trail OK, no advisory", () => {
    // Write matching event BEFORE running hook
    writeFakeDecisionLogEvent(CORRELATION_ID);

    const payload = buildPayload({ toolName: APPLY_EDIT_TOOL, agentName: "implementer" });
    const { exitCode, result } = runHook(payload);
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("trail OK");
    expect((result?.hookSpecificOutput as Record<string, unknown> | undefined)?.permissionDecision).toBeUndefined();
  });

  test("T3. No paired agent_decision_logged → advisory emitted, NOT blocking (strike 1)", () => {
    // Do NOT write any matching event
    const payload = buildPayload({ toolName: APPLY_EDIT_TOOL, agentName: "implementer" });
    const { exitCode, result } = runHook(payload);

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");  // advisory → continue
    expect(result?.message).toContain("advisory");

    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    // Should have additionalContext but NOT permissionDecision = "deny"
    expect(typeof output?.additionalContext).toBe("string");
    expect(output?.permissionDecision).toBeUndefined();

    // Strike file should now exist with count=1
    const strikePath = path.join(TMP, ".palantir-mini", "session", "decision-audit-strikes.json");
    expect(fs.existsSync(strikePath)).toBe(true);
    const strikes = JSON.parse(fs.readFileSync(strikePath, "utf8")) as { count: number };
    expect(strikes.count).toBe(1);
  });

  test("T3b. 4 strikes accumulated → still advisory (not blocking)", () => {
    // Pre-seed 4 strikes (threshold is 5)
    writeStrikes(4);

    const payload = buildPayload({ toolName: COMMIT_EDITS_TOOL, agentName: "implementer" });
    const { exitCode, result } = runHook(payload);

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");  // advisory
    expect(result?.message).toContain("advisory");

    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(typeof output?.additionalContext).toBe("string");
    expect(output?.permissionDecision).toBeUndefined();
  });

  test("T4. 5 strikes accumulated → 6th call blocks with permissionDecision=deny", () => {
    // Pre-seed exactly 5 strikes (so the next miss becomes strike 6 → block)
    writeStrikes(5);

    const payload = buildPayload({ toolName: APPLY_EDIT_TOOL, agentName: "implementer" });
    const { exitCode, result } = runHook(payload);

    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("block");

    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(output?.permissionDecision).toBe("deny");
    expect(typeof output?.permissionDecisionReason).toBe("string");
    expect((output?.permissionDecisionReason as string)).toContain("PALANTIR_MINI_DECISION_AUDIT_BYPASS=1");
    expect(result?.message).toContain("BLOCK");
  });

  test("T5. PALANTIR_MINI_DECISION_AUDIT_BYPASS=1 → no advisory, no block", () => {
    const payload = buildPayload({ toolName: APPLY_EDIT_TOOL, agentName: "implementer" });
    const { exitCode, result } = runHook(payload, {
      PALANTIR_MINI_DECISION_AUDIT_BYPASS: "1",
    });
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("BYPASS");
    // No deny
    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(output?.permissionDecision).toBeUndefined();
  });

  test("T6. Non-gate-crossing tool (Bash) → skipped immediately", () => {
    const payload = { tool_name: "Bash", cwd: TMP, session_id: "sess-test" };
    const { exitCode, result } = runHook(payload);
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("skipped");
  });

  test("T7. emit_event emitting agent_decision_logged itself → self-referential skip", () => {
    const payload = {
      tool_name:  EMIT_EVENT_TOOL,
      cwd:        TMP,
      session_id: "sess-test",
      tool_input: {
        project: TMP,
        byWhom:  { agentName: "implementer" },
        payload: { errorClass: "agent_decision_logged" },
      },
    };
    const { exitCode, result } = runHook(payload);
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("agent_decision_logged itself");
  });

  test("T8. No correlationId available → advisory (no_correlation_id)", () => {
    // Remove the env-direct correlationId
    const payload = buildPayload({ toolName: APPLY_EDIT_TOOL, agentName: "implementer" });
    const { exitCode, result } = runHook(payload, {
      PALANTIR_MINI_CORRELATION_ID: "",  // cleared
    });
    expect(exitCode).toBe(0);
    expect(result?.decision).toBe("continue");
    // Message or additionalContext should indicate no correlationId
    const output = result?.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(typeof output?.additionalContext).toBe("string");
    expect(output?.permissionDecision).toBeUndefined();
  });

});
