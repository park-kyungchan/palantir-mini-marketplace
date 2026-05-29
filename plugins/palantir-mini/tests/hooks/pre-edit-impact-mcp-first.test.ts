// palantir-mini v4.15.0 — pre-edit-impact-mcp-first hook tests (sprint-063 W2.B)
// 9 test cases:
//   1. passed   — impact_query event in last 5 min for matching file
//   2. bypassed — no mcp call found within window
//   3. passed   — pm-impact-quick skill_started event for matching file
//   4. passed   — pre_edit_impact event found (replaces semantic_change_plan; sprint-063 W2.B)
//   5. bypassed — mcp call exists but outside 5-min window (stale)
//   6. skipped  — no file_path in payload
//   7. skipped  — not a tracked project (no .palantir-mini/)
//   8. bypass   — PALANTIR_MINI_MCP_FIRST_BYPASS=1
//   9. blocked  — mcp call with no RID payload (generic call; weak evidence)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import preEditImpactMcpFirst from "../../hooks/pre-edit-impact-mcp-first";

let TMP: string;
let savedBypass: string | undefined;

/** Build a minimal .palantir-mini project fixture */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

/** Write an event to events.jsonl at the given age (ageMs = milliseconds ago) */
function writeEvent(
  type: string,
  payload: Record<string, unknown>,
  throughWhich: Record<string, unknown>,
  ageMs = 0
): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const when = new Date(Date.now() - ageMs).toISOString();
  const evt = {
    type,
    eventId: `evt-test-${Date.now()}`,
    when,
    atopWhich: "abc123",
    sequence: Date.now(),
    throughWhich: { sessionId: "test-session", cwd: TMP, ...throughWhich },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "test event" },
    payload,
  };
  fs.appendFileSync(eventsPath, JSON.stringify(evt) + "\n", "utf8");
}

/** Build a PreToolUse payload */
function makePayload(
  filePath?: string,
  overrides: Record<string, unknown> = {}
): unknown {
  return {
    cwd: TMP,
    session_id: "test-session",
    tool_name: "Edit",
    tool_input: { file_path: filePath ?? path.join(TMP, "src", "foo.ts") },
    ...overrides,
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-mcp-first-"));
  savedBypass = process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  delete process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  setupProject();
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_MCP_FIRST_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_MCP_FIRST_BYPASS;
  }
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("pre-edit-impact-mcp-first", () => {
  test("1. PASSED — impact_query event within 5 min for matching file RID", async () => {
    const targetFile = path.join(TMP, "src", "foo.ts");
    fs.mkdirSync(path.join(TMP, "src"), { recursive: true });

    // Write an impact_query event 2 min ago with matching rid
    writeEvent(
      "mcp_tool_invoked",
      { rid: "src/foo.ts", depth: 3 },
      { toolName: "impact_query" },
      2 * 60 * 1000 // 2 minutes ago
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
    };

    expect(result.message).toContain("PASSED");
    expect(result.additionalContext).toBeUndefined();
  });

  test("2. BLOCKED — no mcp call found within window", async () => {
    const targetFile = path.join(TMP, "lib", "utils.ts");
    fs.mkdirSync(path.join(TMP, "lib"), { recursive: true });

    // No events written

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
    };

    // sprint-063 W2.B: blocking mode — deny when no MCP call found
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("impact_query");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("pm-impact-quick");
    // semantic_change_plan must NOT appear in the deny reason
    expect(result.hookSpecificOutput?.permissionDecisionReason).not.toContain("semantic_change_plan");
  });

  test("3. PASSED — pm-impact-quick skill_started event for matching file", async () => {
    const targetFile = path.join(TMP, "hooks", "my-hook.ts");
    fs.mkdirSync(path.join(TMP, "hooks"), { recursive: true });

    // Write skill_started event 1 min ago with skillContext matching hooks/
    writeEvent(
      "skill_started",
      { skillName: "pm-impact-quick", rid: "hooks/my-hook.ts", skillContext: "hooks/my-hook.ts" },
      { toolName: "mcp__palantir-mini__emit_event" },
      1 * 60 * 1000 // 1 minute ago
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
    };

    expect(result.message).toContain("PASSED");
  });

  test("4. PASSED — pre_edit_impact event found for parent directory (sprint-063 W2.B replaces semantic_change_plan)", async () => {
    const targetFile = path.join(TMP, "ontology", "primitives", "foo.ts");
    fs.mkdirSync(path.join(TMP, "ontology", "primitives"), { recursive: true });

    // pre_edit_impact for the parent dir 3 min ago
    writeEvent(
      "mcp_tool_invoked",
      { rid: "ontology/primitives" },
      { toolName: "pre_edit_impact" },
      3 * 60 * 1000 // 3 minutes ago
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
    };

    expect(result.message).toContain("PASSED");
  });

  test("4b. PASSED — Codex namespace pre_edit_impact event found for parent directory", async () => {
    const targetFile = path.join(TMP, "ontology", "runtime", "codex.ts");
    fs.mkdirSync(path.join(TMP, "ontology", "runtime"), { recursive: true });

    writeEvent(
      "mcp_tool_invoked",
      { rid: "ontology/runtime" },
      { toolName: "mcp__palantir_mini__pre_edit_impact" },
      3 * 60 * 1000
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
    };

    expect(result.message).toContain("PASSED");
  });

  test("4c. PASSED — Codex dotted namespace impact_query event found for matching file", async () => {
    const targetFile = path.join(TMP, "ontology", "runtime", "dotted.ts");
    fs.mkdirSync(path.join(TMP, "ontology", "runtime"), { recursive: true });

    writeEvent(
      "mcp_tool_invoked",
      { rid: "ontology/runtime/dotted.ts" },
      { toolName: "mcp__palantir_mini__.impact_query" },
      3 * 60 * 1000
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
    };

    expect(result.message).toContain("PASSED");
  });

  test("5. BLOCKED — mcp call exists but outside 5-min window (stale)", async () => {
    const targetFile = path.join(TMP, "src", "bar.ts");
    fs.mkdirSync(path.join(TMP, "src"), { recursive: true });

    // impact_query 8 minutes ago — outside 5 min window
    writeEvent(
      "mcp_tool_invoked",
      { rid: "src/bar.ts" },
      { toolName: "impact_query" },
      8 * 60 * 1000 // 8 minutes ago — stale
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
    };

    // sprint-063 W2.B: stale MCP call → blocked (deny)
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("impact_query");
  });

  test("6. SKIPPED — no file_path in payload", async () => {
    const result = await preEditImpactMcpFirst({
      cwd: TMP,
      session_id: "test-session",
      tool_name: "Write",
      tool_input: {},
    }) as { message: string };

    expect(result.message).toContain("skipped");
    expect(result.message).toContain("no file_path");
  });

  test("6b. SKIPPED — canonical .palantir-mini/plan paths are synthesis artifacts", async () => {
    const planFile = path.join(TMP, ".palantir-mini", "plan", "handoff.md");
    const result = await preEditImpactMcpFirst(makePayload(planFile)) as { message: string };
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("synthesis path");
  });

  test("7. SKIPPED — not a tracked project (no .palantir-mini/)", async () => {
    // Create a temp dir without .palantir-mini
    const untrackedDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-untracked-"));
    try {
      const untrackedFile = path.join(untrackedDir, "foo.ts");

      const result = await preEditImpactMcpFirst({
        cwd: untrackedDir,
        session_id: "test-session",
        tool_name: "Edit",
        tool_input: { file_path: untrackedFile },
      }) as { message: string };

      expect(result.message).toContain("skipped");
      expect(result.message).toContain("not a tracked project");
    } finally {
      fs.rmSync(untrackedDir, { recursive: true, force: true });
    }
  });

  test("8. BYPASS — PALANTIR_MINI_MCP_FIRST_BYPASS=1", async () => {
    process.env.PALANTIR_MINI_MCP_FIRST_BYPASS = "1";
    const targetFile = path.join(TMP, "src", "baz.ts");

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
    };

    expect(result.message).toContain("BYPASS");
    expect(result.additionalContext).toBeUndefined();
  });

  test("9. BLOCKED — mcp call with no RID payload is weak evidence", async () => {
    const targetFile = path.join(TMP, "scripts", "run.ts");
    fs.mkdirSync(path.join(TMP, "scripts"), { recursive: true });

    // impact_query 90 sec ago with NO rid payload — generic call
    writeEvent(
      "mcp_tool_invoked",
      { depth: 3 }, // no rid field
      { toolName: "impact_query" },
      90 * 1000 // 90 seconds ago
    );

    const result = await preEditImpactMcpFirst(makePayload(targetFile)) as {
      message: string;
      additionalContext?: string;
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
    };

    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("matching RID/path evidence");
  });
});
