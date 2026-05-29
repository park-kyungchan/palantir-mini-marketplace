// palantir-mini v4.11.0 — pre-delegation-check hook tests (sprint-056 W2.C5 + sprint-057 W4)
// 13 test cases: counter<3 pass / counter≥3+delegation event pass / counter≥3+mode=full pass /
// counter≥3+neither block / synthesis path exempt / bypass env / marker escalation /
// subagent-direct skip / stale 30+min delegation event / missing project root /
// malformed counter file / marker different session / INDEX.md exemption.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import preDelegationCheck from "../../hooks/pre-delegation-check";

let TMP: string;
let savedBypass: string | undefined;

/** Build a minimal .palantir-mini project fixture. */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints"), { recursive: true });
}

/** Write the session counter file with a given count. */
function writeCounter(count: number): void {
  const counterPath = path.join(TMP, ".palantir-mini", "session", ".lead-direct-edit-counter.json");
  fs.writeFileSync(counterPath, JSON.stringify({ count, lastEditTimestamp: new Date().toISOString() }));
}

/** Write a delegation receipt event to events.jsonl (last 5 min = within 30 min window). */
function writeDelegationEvent(sessionId: string): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const evt = {
    type: "validation_phase_completed",
    eventId: "evt-delegation-test",
    when: new Date().toISOString(),
    atopWhich: "abc123",
    sequence: 1,
    throughWhich: { sessionId, toolName: "Bash", cwd: TMP },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "delegation recipe generated" },
    payload: { phase: "design", passed: true, errorClass: "delegation_recipe_generated" },
  };
  fs.writeFileSync(eventsPath, JSON.stringify(evt) + "\n");
}

/** Write a bound SprintContract with a given mode. */
function writeSprintContract(mode: string): void {
  const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-default");
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.writeFileSync(
    path.join(sprintDir, "contract.json"),
    JSON.stringify({ status: "bound", mode, contractId: "test-contract" }),
  );
}

/** Write the complex-task-pending marker file for the given sessionId. */
function writeComplexMarker(sessionId: string, conditionsMatched: string[]): void {
  const markerPath = path.join(TMP, ".palantir-mini", "session", ".complex-task-pending.json");
  fs.writeFileSync(markerPath, JSON.stringify({ sessionId, conditionsMatched, when: new Date().toISOString() }));
}

/** Build a PreToolUse payload for an Edit on a file in TMP. */
function makeEditPayload(
  filePath?: string,
  overrides: Record<string, unknown> = {},
): unknown {
  return {
    cwd: TMP,
    session_id: "test-session",
    tool_name: "Edit",
    tool_input: { file_path: filePath ?? path.join(TMP, "foo.ts") },
    ...overrides,
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-predelegation-"));
  savedBypass = process.env.PALANTIR_MINI_PREDELEGATION_BYPASS;
  delete process.env.PALANTIR_MINI_PREDELEGATION_BYPASS;
  setupProject();
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_PREDELEGATION_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_PREDELEGATION_BYPASS;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Test 1: counter < 3 → pass-through ──────────────────────────────────────

describe("counter_below_threshold", () => {
  test("counter=2 → pass-through with OK message", async () => {
    writeCounter(2);
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.message).toContain("OK");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 2: counter ≥ 3 + delegation event → pass-through ───────────────────

describe("counter_ge3_with_delegation_event", () => {
  test("counter=4 + delegation event in events.jsonl → pass-through", async () => {
    writeCounter(4);
    writeDelegationEvent("test-session");
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.message).toContain("OK");
    expect(result.message).toContain("delegation event");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 3: counter ≥ 3 + sprint mode=full → pass-through ───────────────────

describe("counter_ge3_full_mode_contract", () => {
  test("counter=5 + mode=full SprintContract → pass-through", async () => {
    writeCounter(5);
    writeSprintContract("full");
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.message).toContain("OK");
    expect(result.message).toContain("mode=full");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 4: counter ≥ 3 + no delegation, no full-mode → block ───────────────

describe("counter_ge3_no_delegation_block", () => {
  test("counter=3 + no delegation event + quick mode → deny", async () => {
    writeCounter(3);
    writeSprintContract("quick");
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("pm-delegate-or-direct");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("rule 12 v3.4.0");
    expect(result.message).toContain("BLOCK");
  });
});

// ─── Test 5: synthesis path exempt ───────────────────────────────────────────

describe("synthesis_path_exempt", () => {
  test("file ending with BROWSE.md is exempt even with counter=10", async () => {
    writeCounter(10);
    const home = process.env.HOME ?? "/home/palantirkc";
    const browsePath = path.join(home, ".claude", "research", "BROWSE.md");
    const result = await preDelegationCheck(makeEditPayload(browsePath));
    expect(result.message).toContain("EXEMPT");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  test("file under ~/.claude/plans/ is exempt even with counter=10", async () => {
    writeCounter(10);
    const home = process.env.HOME ?? "/home/palantirkc";
    const planPath = path.join(home, ".claude", "plans", "some-plan.md");
    const result = await preDelegationCheck(makeEditPayload(planPath));
    expect(result.message).toContain("EXEMPT");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  test("file under .palantir-mini/plan/ is exempt even with counter=10", async () => {
    writeCounter(10);
    const planPath = path.join(TMP, ".palantir-mini", "plan", "some-plan.md");
    const result = await preDelegationCheck(makeEditPayload(planPath));
    expect(result.message).toContain("EXEMPT");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 6: bypass env var ───────────────────────────────────────────────────

describe("bypass_env", () => {
  test("PALANTIR_MINI_PREDELEGATION_BYPASS=1 → pass-through even with counter=20", async () => {
    process.env.PALANTIR_MINI_PREDELEGATION_BYPASS = "1";
    writeCounter(20);
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.message).toContain("BYPASS");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 7: complex-task marker escalation ───────────────────────────────────

describe("complex_task_marker_escalation", () => {
  test("counter=3 + complex-task marker + no delegation → deny with escalated message", async () => {
    writeCounter(3);
    writeSprintContract("quick");
    writeComplexMarker("test-session", ["length≥800", "keyword-count≥2"]);
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("ESCALATED");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("Complex-task heuristic");
    expect(result.message).toContain("BLOCK");
    expect(result.message).toContain("escalated=true");
  });
});

// ─── sprint-057 W4 edge cases ──────────────────────────────────────────────────

/** Write a delegation event with custom age (millis ago). */
function writeDelegationEventAged(sessionId: string, ageMs: number): void {
  const eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  const evt = {
    type: "validation_phase_completed",
    eventId: "evt-delegation-aged",
    when: new Date(Date.now() - ageMs).toISOString(),
    atopWhich: "abc123",
    sequence: 1,
    throughWhich: { sessionId, toolName: "Bash", cwd: TMP },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "delegation recipe generated (aged)" },
    payload: { phase: "design", passed: true, errorClass: "delegation_recipe_generated" },
  };
  fs.writeFileSync(eventsPath, JSON.stringify(evt) + "\n");
}

// ─── Test 8: subagent-direct skip ─────────────────────────────────────────────

describe("subagent_direct_skip", () => {
  test("subagent_type set + counter=10 → skipped (subagent has no delegation obligation)", async () => {
    writeCounter(10);
    const payload = makeEditPayload(undefined, { subagent_type: "implementer" });
    const result = await preDelegationCheck(payload);
    expect(result.message).toContain("skipped (subagent edit");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 9: stale 30+min delegation event → block ────────────────────────────

describe("stale_delegation_event", () => {
  test("counter=4 + delegation event 35 min old → block (cutoff exceeded)", async () => {
    writeCounter(4);
    writeSprintContract("quick");
    writeDelegationEventAged("test-session", 35 * 60 * 1000); // 35 min ago
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.message).toContain("BLOCK");
  });
});

// ─── Test 10: missing project root → silent skip ──────────────────────────────

describe("missing_project_root", () => {
  test("cwd at filesystem root → silent skip (loop exits immediately, no .palantir-mini)", async () => {
    // Use "/" as cwd — findProjectRoot walks up from "/" but loop exits immediately
    // (cur === root). Robust against /tmp/.palantir-mini pollution from prior test runs.
    const payload = makeEditPayload("/foo.ts", { cwd: "/" });
    const result = await preDelegationCheck(payload);
    expect(result.message).toContain("no project root");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 11: malformed counter file → treated as 0 ───────────────────────────

describe("malformed_counter_file", () => {
  test("counter file with non-JSON content → treated as count=0, pass-through", async () => {
    const counterPath = path.join(TMP, ".palantir-mini", "session", ".lead-direct-edit-counter.json");
    fs.writeFileSync(counterPath, "this is not JSON {{{{");
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.message).toContain("OK");
    expect(result.message).toContain("count=0");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 12: marker from different session → not escalated ───────────────────

describe("marker_different_session", () => {
  test("counter=3 + marker for different sessionId → regular block (not escalated)", async () => {
    writeCounter(3);
    writeSprintContract("quick");
    writeComplexMarker("OTHER-session", ["length≥800"]); // payload sessionId is "test-session"
    const result = await preDelegationCheck(makeEditPayload());
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    // Ensure NOT escalated — marker should be ignored (cross-session)
    expect(result.hookSpecificOutput?.permissionDecisionReason).not.toContain("ESCALATED");
    expect(result.message).toContain("BLOCK");
    expect(result.message).not.toContain("escalated=true");
  });
});

// ─── Test 13: INDEX.md exemption ──────────────────────────────────────────────

describe("INDEX_md_exemption", () => {
  test("file ending with INDEX.md is exempt even with counter=10", async () => {
    writeCounter(10);
    const home = process.env.HOME ?? "/home/palantirkc";
    const indexPath = path.join(home, ".claude", "research", "INDEX.md");
    const result = await preDelegationCheck(makeEditPayload(indexPath));
    expect(result.message).toContain("EXEMPT");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});
