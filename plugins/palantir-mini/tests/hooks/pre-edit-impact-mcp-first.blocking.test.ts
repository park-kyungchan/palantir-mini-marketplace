// palantir-mini v4.15.0 — pre-edit-impact-mcp-first BLOCKING tests (sprint-063 W2.B)
// Tests: edit without MCP call → deny; edit with recent MCP call → continue;
// synthesis path → continue; small file → continue; advisory-only env → no deny;
// bypass env → continue; no project root → continue; advisory escape valve.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import preEditImpactMcpFirst from "../../hooks/pre-edit-impact-mcp-first";

let TMP: string;
let savedBypass: string | undefined;
let savedAdvisoryOnly: string | undefined;

/** Build a minimal .palantir-mini project fixture in TMP. */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints"), { recursive: true });
}

/**
 * Write an MCP impact_query event to events.jsonl with `when` set to `offsetMs` ago.
 * Default offsetMs = 60_000 (1 minute ago = within 5-min window).
 */
function writeMcpEvent(toolName: string, offsetMs = 60_000): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const evt = {
    type: "validation_phase_completed",
    eventId: "evt-mcp-test",
    when: new Date(Date.now() - offsetMs).toISOString(),
    atopWhich: "abc123",
    sequence: 1,
    throughWhich: { sessionId: "test", toolName, cwd: TMP },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "test mcp call" },
    payload: { phase: "design", passed: true, rid: "foo.ts", proposedFiles: ["foo.ts"] },
  };
  fs.writeFileSync(eventsPath, JSON.stringify(evt) + "\n");
}

/** Write a stale MCP event (beyond 5-minute window). */
function writeStaleEvent(): void {
  writeMcpEvent("impact_query", 10 * 60 * 1000); // 10 minutes ago
}

/** Build a PreToolUse Edit payload for a TS file in TMP. */
function makeEditPayload(
  filePath?: string,
  oldString = "x".repeat(500), // > 400 chars → NOT small change
  overrides: Record<string, unknown> = {}
): unknown {
  return {
    cwd: TMP,
    session_id: "test-session",
    tool_name: "Edit",
    tool_input: {
      file_path: filePath ?? path.join(TMP, "foo.ts"),
      old_string: oldString,
    },
    ...overrides,
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-mcp-first-block-"));
  savedBypass = process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  savedAdvisoryOnly = process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY;
  delete process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  delete process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY;
  setupProject();
  // Override PALANTIR_MINI_EVENTS_FILE so all events land in TMP
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_MCP_FIRST_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  }
  if (savedAdvisoryOnly !== undefined) {
    process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY = savedAdvisoryOnly;
  } else {
    delete process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY;
  }
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("pre-edit-impact-mcp-first (blocking mode)", () => {
  test("T1: edit without MCP call → deny", async () => {
    // No events.jsonl at all → no MCP call → block
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("rule 12 v3.10.0");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("MCP-First protocol");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("mcp__palantir_mini__impact_query");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("mcp__palantir_mini__pre_edit_impact");
  });

  test("T2: edit with recent impact_query event → continue", async () => {
    writeMcpEvent("impact_query");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("T3: edit with recent pre_edit_impact event → continue (sprint-063 W2.B; semantic_change_plan removed)", async () => {
    writeMcpEvent("pre_edit_impact");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("T4: edit with recent mcp__ prefixed tool call → continue", async () => {
    writeMcpEvent("mcp__plugin_palantir-mini_palantir-mini__impact_query");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
  });

  test("T4b: edit with recent Codex namespace impact_query call → continue", async () => {
    writeMcpEvent("mcp__palantir_mini__impact_query");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("T4c: edit with recent Codex dotted namespace pre_edit_impact call → continue", async () => {
    writeMcpEvent("mcp__palantir_mini__.pre_edit_impact");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("T4d: edit with recent managed-settings hyphen namespace get_ontology call → continue", async () => {
    writeMcpEvent("mcp__palantir-mini__get_ontology");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("T4e: legacy removed evidence tools do not satisfy MCP-first", async () => {
    writeMcpEvent("mcp__palantir_mini__propagation_audit_forward");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("T5: edit with STALE MCP call (>5 min ago) → deny", async () => {
    writeStaleEvent();
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("T6: synthesis path (plans/) → continue (no deny)", async () => {
    const home = process.env.HOME ?? "/home/palantirkc";
    const plansFile = path.join(home, ".claude", "plans", "test-plan.md");
    const result = await preEditImpactMcpFirst(
      makeEditPayload(plansFile)
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("synthesis path");
  });

  test("T7: BROWSE.md → continue (synthesis path)", async () => {
    const result = await preEditImpactMcpFirst(
      makeEditPayload(path.join(TMP, "BROWSE.md"))
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("synthesis path");
  });

  test("T8: small change (≤400 chars old_string) → continue", async () => {
    // 100 chars → well below 400 threshold
    const result = await preEditImpactMcpFirst(
      makeEditPayload(path.join(TMP, "foo.ts"), "x".repeat(100))
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("small change");
  });

  test("T9: PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1 → advisory (no deny)", async () => {
    process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY = "1";
    // No MCP call, large change → should warn but NOT deny
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("ADVISORY");
    expect(result.additionalContext).toContain("rule 12 v3.10.0");
  });

  test("T10: PALANTIR_MINI_MCP_FIRST_BYPASS=1 → continue (bypass audited)", async () => {
    process.env.PALANTIR_MINI_MCP_FIRST_BYPASS = "1";
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("BYPASS");
  });

  test("T11: no file_path in tool_input → skip (continue)", async () => {
    const result = await preEditImpactMcpFirst({
      cwd: TMP,
      session_id: "test-session",
      tool_name: "Edit",
      tool_input: {},
    });
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("skipped");
  });

  // sprint-062 W3 fixture issue: hook treats /tmp as tracked due to env-var leak between tests; sprint-063 W6 carry-over
  test.skip("T12: file not in tracked project → skip (continue)", async () => {
    // Use /tmp path with no .palantir-mini parent
    const result = await preEditImpactMcpFirst(
      makeEditPayload("/tmp/some-random-file.ts")
    );
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("skipped");
  });

  test("T13: get_ontology call satisfies MCP-first → continue", async () => {
    writeMcpEvent("get_ontology");
    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    expect(result.message).toContain("PASSED");
  });

  test("T14: generic impact_query without RID/path evidence → deny", async () => {
    const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
    const evt = {
      type: "validation_phase_completed",
      eventId: "evt-generic-mcp-test",
      when: new Date().toISOString(),
      atopWhich: "abc123",
      sequence: 2,
      throughWhich: { sessionId: "test", toolName: "impact_query", cwd: TMP },
      byWhom: { identity: "claude-code" },
      withWhat: { reasoning: "generic mcp call" },
      payload: { phase: "design", passed: true, depth: 3 },
    };
    fs.writeFileSync(eventsPath, JSON.stringify(evt) + "\n");

    const result = await preEditImpactMcpFirst(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("matching RID/path evidence");
  });
});
