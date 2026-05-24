// palantir-mini v4.11.0 — task-context-budget-enforcer hook tests (sprint-057 W6)
//
// 6 test cases: small prompt pass / advisory threshold / block threshold /
// bypass env / no prompt skip / token estimate accuracy.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import taskContextBudgetEnforcer, {
  estimateTokens,
  ADVISORY_THRESHOLD_TOKENS,
  BLOCK_THRESHOLD_TOKENS,
} from "../../hooks/task-context-budget-enforcer";

let savedBypass: string | undefined;

beforeEach(() => {
  savedBypass = process.env.PALANTIR_MINI_TASK_BUDGET_BYPASS;
  delete process.env.PALANTIR_MINI_TASK_BUDGET_BYPASS;
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_TASK_BUDGET_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_TASK_BUDGET_BYPASS;
  }
});

function makeAgentPayload(prompt: string, subagentType = "implementer"): unknown {
  return {
    cwd: "/tmp",
    session_id: "test-session",
    tool_name: "Agent",
    tool_input: { prompt, subagent_type: subagentType, description: "test task" },
  };
}

// ─── Test 1: small prompt under advisory threshold → pass-through ─────────────

describe("small_prompt_passthrough", () => {
  test("prompt of 100 chars (~30 tokens) → OK pass-through", async () => {
    const result = await taskContextBudgetEnforcer(makeAgentPayload("A".repeat(100)));
    expect(result.message).toContain("OK");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 2: prompt at advisory threshold → ADVISORY (no block) ───────────────

describe("advisory_threshold", () => {
  test(`prompt at ~${ADVISORY_THRESHOLD_TOKENS} tokens → advisory (allow with additionalContext)`, async () => {
    // Construct prompt with ~10K tokens = ~35K chars
    const prompt = "A".repeat(ADVISORY_THRESHOLD_TOKENS * 4); // chars, > advisory threshold
    const result = await taskContextBudgetEnforcer(makeAgentPayload(prompt));
    expect(result.message).toContain("ADVISORY");
    expect(result.hookSpecificOutput?.additionalContext).toContain("Consider splitting");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 3: prompt at block threshold → BLOCK with deny ──────────────────────

describe("block_threshold", () => {
  test(`prompt at ~${BLOCK_THRESHOLD_TOKENS} tokens → BLOCK with permissionDecision=deny`, async () => {
    // Construct prompt with ~16K tokens = ~56K chars (well above 15K block)
    const prompt = "A".repeat(BLOCK_THRESHOLD_TOKENS * 4);
    const result = await taskContextBudgetEnforcer(makeAgentPayload(prompt));
    expect(result.message).toContain("BLOCK");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("Rule 12");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("Split into 2+");
  });
});

// ─── Test 4: bypass env → pass-through even at huge prompt ────────────────────

describe("bypass_env", () => {
  test("PALANTIR_MINI_TASK_BUDGET_BYPASS=1 + huge prompt → BYPASS pass-through", async () => {
    process.env.PALANTIR_MINI_TASK_BUDGET_BYPASS = "1";
    const prompt = "A".repeat(BLOCK_THRESHOLD_TOKENS * 10); // huge — well above block
    const result = await taskContextBudgetEnforcer(makeAgentPayload(prompt));
    expect(result.message).toContain("BYPASS");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 5: no prompt → skipped ──────────────────────────────────────────────

describe("no_prompt_skip", () => {
  test("payload with no tool_input.prompt → skipped pass-through", async () => {
    const payload = { cwd: "/tmp", tool_name: "Agent", tool_input: { subagent_type: "implementer" } };
    const result = await taskContextBudgetEnforcer(payload);
    expect(result.message).toContain("skipped");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

// ─── Test 6: estimateTokens math sanity ───────────────────────────────────────

describe("estimateTokens_math", () => {
  test("3.5 chars per token (conservative)", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("A".repeat(35))).toBe(10);   // 35/3.5 = 10
    expect(estimateTokens("A".repeat(350))).toBe(100); // 350/3.5 = 100
    expect(estimateTokens("A".repeat(35000))).toBe(10000); // matches advisory threshold
    expect(estimateTokens("A".repeat(52500))).toBe(15000); // matches block threshold
  });
});
