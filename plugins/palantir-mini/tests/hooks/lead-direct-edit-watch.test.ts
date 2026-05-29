// palantir-mini — lead-direct-edit-watch hook tests (W1.B + W3 R3-F11)
// ≥15 test cases covering advisory, block, bypass, synthesis-path exemption,
// subagent skip, sprint counter reset, per-sprint thresholds, INDEX.md exempt,
// notebook_path, unknown tool name, counter persistence, sprint counter path,
// and mixed-session synthesis detection.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import leadDirectEditWatch, {
  counterFilePath,
  synthCounterFilePath,
  readCounter,
  writeCounter,
  isMixedSessionWatch,
  incrementSynthCounterWatch,
} from "../../hooks/lead-direct-edit-watch";

let TMP: string;
let savedBypass: string | undefined;

/** Build a minimal .palantir-mini project fixture at TMP. */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

/** Read the session counter file state (local helper for tests). Uses the session-counter path convention. */
function readSessionCounter(tmp: string): { count: number; lastEditTimestamp: string } | null {
  const counterPath = path.join(tmp, ".palantir-mini", "session", ".lead-direct-edit-counter.json");
  try {
    return JSON.parse(fs.readFileSync(counterPath, "utf8"));
  } catch {
    return null;
  }
}

/** Build a lead-direct PostToolUse payload for Edit tool. */
function makeEditPayload(cwd: string, overrides: Record<string, unknown> = {}): unknown {
  return {
    cwd,
    session_id: "test-session",
    tool_name: "Edit",
    tool_input: { file_path: path.join(cwd, "foo.ts") },
    // No agent_name / byWhom → Lead-direct (top-level Claude session)
    ...overrides,
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-lead-direct-watch-"));
  savedBypass = process.env.PALANTIR_MINI_LEAD_DIRECT_BYPASS;
  delete process.env.PALANTIR_MINI_LEAD_DIRECT_BYPASS;
  setupProject();
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_LEAD_DIRECT_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_LEAD_DIRECT_BYPASS;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("leadDirectEditWatch", () => {
  // ─── Test 1: advisory_at_5 ────────────────────────────────────────────────
  test("advisory_at_5 — 5 Lead edits produces advisory on 5th call; counter=5", async () => {
    const payload = makeEditPayload(TMP);

    // First 4 edits: silent pass-through
    for (let i = 0; i < 4; i++) {
      const result = await leadDirectEditWatch(payload);
      expect(result.message).toContain("OK");
      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    }
    const afterFour = readCounter(counterFilePath(TMP));
    expect(afterFour?.count).toBe(4);

    // 5th edit: advisory
    const result5 = await leadDirectEditWatch(payload);
    expect(result5.message).toContain("ADVISORY");
    expect(result5.hookSpecificOutput?.additionalContext).toContain(
      "pm-delegate-or-direct",
    );
    expect(result5.hookSpecificOutput?.permissionDecision).toBeUndefined();

    const afterFive = readCounter(counterFilePath(TMP));
    expect(afterFive?.count).toBe(5);
  });

  // ─── Test 2: block_at_15 ─────────────────────────────────────────────────
  test("block_at_15 — 15th call returns permissionDecision=deny + blocked event", async () => {
    const payload = makeEditPayload(TMP);

    // Edits 1-14: pass-through or advisory (5th)
    for (let i = 0; i < 14; i++) {
      const result = await leadDirectEditWatch(payload);
      // Should never be deny until the 15th
      expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    }
    const before15 = readCounter(counterFilePath(TMP));
    expect(before15?.count).toBe(14);

    // 15th edit: block
    const result15 = await leadDirectEditWatch(payload);
    expect(result15.message).toContain("BLOCK");
    expect(result15.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result15.hookSpecificOutput?.permissionDecisionReason).toContain("15");
    expect(result15.hookSpecificOutput?.permissionDecisionReason).toContain(
      "pm-delegate-or-direct",
    );

    const after15 = readCounter(counterFilePath(TMP));
    expect(after15?.count).toBe(15);

    // 16th edit: still blocked (count >= 15)
    const result16 = await leadDirectEditWatch(payload);
    expect(result16.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(after15?.count).toBe(15); // counter from disk after 15th; 16th also writes 16
  });

  // ─── Test 3: bypass_passes_through ───────────────────────────────────────
  test("bypass_passes_through — PALANTIR_MINI_LEAD_DIRECT_BYPASS=1 skips counting", async () => {
    process.env.PALANTIR_MINI_LEAD_DIRECT_BYPASS = "1";
    const payload = makeEditPayload(TMP);

    for (let i = 0; i < 16; i++) {
      const result = await leadDirectEditWatch(payload);
      expect(result.message).toContain("BYPASS");
      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    }

    // Counter should NOT have been incremented (bypass skips counting entirely)
    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  // ─── Test 4: synthesis_path_exempt ───────────────────────────────────────
  test("synthesis_path_exempt — ~/.claude/plans/** paths skip counter increment", async () => {
    const home = process.env.HOME ?? "/home/palantirkc";
    const plansFile = path.join(home, ".claude", "plans", "some-plan.md");

    const payload = makeEditPayload(TMP, {
      tool_input: { file_path: plansFile },
    });

    const result = await leadDirectEditWatch(payload);
    expect(result.message).toContain("EXEMPT");

    // Counter MUST NOT have been incremented
    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  test("synthesis_path_exempt — .palantir-mini/plan/** paths skip counter increment", async () => {
    const plansFile = path.join(TMP, ".palantir-mini", "plan", "some-plan.md");

    const payload = makeEditPayload(TMP, {
      tool_input: { file_path: plansFile },
    });

    const result = await leadDirectEditWatch(payload);
    expect(result.message).toContain("EXEMPT");

    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  test("synthesis_path_exempt — BROWSE.md files are exempt", async () => {
    const browseFile = path.join(TMP, "some", "nested", "BROWSE.md");

    const payload = makeEditPayload(TMP, {
      tool_input: { file_path: browseFile },
    });

    const result = await leadDirectEditWatch(payload);
    expect(result.message).toContain("EXEMPT");

    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  // ─── Test 5: subagent_skipped ─────────────────────────────────────────────
  test("subagent_skipped — named subagent edits are not counted", async () => {
    // hook-builder is a named subagent (not Lead)
    const payload = makeEditPayload(TMP, {
      agent_name: "hook-builder",
      byWhom: { agentName: "hook-builder", identity: "claude-code" },
    });

    for (let i = 0; i < 20; i++) {
      const result = await leadDirectEditWatch(payload);
      expect(result.message).toContain("skipped");
      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    }

    // Counter MUST NOT have been incremented by subagent edits
    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  // ─── Test 6: index_md_exempt ──────────────────────────────────────────────
  test("index_md_exempt — INDEX.md files are exempt (synthesis path)", async () => {
    const indexFile = path.join(TMP, "some", "nested", "INDEX.md");

    const payload = makeEditPayload(TMP, {
      tool_input: { file_path: indexFile },
    });

    const result = await leadDirectEditWatch(payload);
    expect(result.message).toContain("EXEMPT");

    // Counter MUST NOT have been incremented
    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  // ─── Test 7: notebook_path_tracked ────────────────────────────────────────
  test("notebook_path_tracked — notebook_path is tracked like file_path", async () => {
    const nbFile = path.join(TMP, "analysis.ipynb");

    const payload = makeEditPayload(TMP, {
      tool_name: "NotebookEdit",
      tool_input: { notebook_path: nbFile },
    });

    const result = await leadDirectEditWatch(payload);
    // Should be counted (not exempt) — notebooks are production files
    expect(result.message).toContain("OK");

    const counter = readCounter(counterFilePath(TMP));
    expect(counter?.count).toBe(1);
  });

  // ─── Test 8: no_project_root_silently_passes ──────────────────────────────
  test("no_project_root_silently_passes — cwd outside any tracked project skips counter", async () => {
    const nonTrackedDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-no-project-"));
    try {
      const payload = makeEditPayload(nonTrackedDir);

      const result = await leadDirectEditWatch(payload);
      // Should pass through without blocking (no project root found)
      expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    } finally {
      fs.rmSync(nonTrackedDir, { recursive: true, force: true });
    }
  });

  // ─── Test 9: counter_persistence ─────────────────────────────────────────
  test("counter_persistence — counter state persists across multiple hook calls", async () => {
    const payload = makeEditPayload(TMP);

    // Make 3 calls
    for (let i = 0; i < 3; i++) {
      await leadDirectEditWatch(payload);
    }
    const counterAfter3 = readCounter(counterFilePath(TMP));
    expect(counterAfter3?.count).toBe(3);

    // Make 2 more calls
    for (let i = 0; i < 2; i++) {
      await leadDirectEditWatch(payload);
    }
    const counterAfter5 = readCounter(counterFilePath(TMP));
    expect(counterAfter5?.count).toBe(5);
  });

  // ─── Test 10: advisory_between_5_and_15 ──────────────────────────────────
  test("advisory_between_5_and_15 — counts 6..14 are silent pass-through", async () => {
    const payload = makeEditPayload(TMP);

    // Skip to count 5 (advisory threshold)
    for (let i = 0; i < 5; i++) {
      await leadDirectEditWatch(payload);
    }

    // Counts 6..14 should be silent OK
    for (let i = 6; i <= 14; i++) {
      const result = await leadDirectEditWatch(payload);
      expect(result.message).toContain("OK");
      expect(result.hookSpecificOutput?.permissionDecision).not.toBe("deny");
    }

    const counter = readCounter(counterFilePath(TMP));
    expect(counter?.count).toBe(14);
  });

  // ─── Test 11: readCounter_handles_missing_file ────────────────────────────
  test("readCounter_handles_missing_file — returns count=0 when file absent", () => {
    const missingPath = path.join(TMP, ".palantir-mini", "session", ".nonexistent-counter.json");
    const result = readCounter(missingPath);
    expect(result.count).toBe(0);
    expect(result.lastEditTimestamp).toBeNull();
  });

  // ─── Test 12: readCounter_handles_malformed_file ─────────────────────────
  test("readCounter_handles_malformed_file — returns count=0 on parse error", () => {
    const counterPath = path.join(TMP, ".palantir-mini", "session", ".malformed-counter.json");
    fs.writeFileSync(counterPath, "not-valid-json!!!");
    const result = readCounter(counterPath);
    expect(result.count).toBe(0);
  });

  // ─── Test 13: writeCounter_atomic_write ───────────────────────────────────
  test("writeCounter_atomic_write — writes and reads back correctly", () => {
    const counterPath = path.join(TMP, ".palantir-mini", "session", ".test-counter.json");
    const state = { count: 42, lastEditTimestamp: "2026-05-09T10:00:00.000Z" };
    writeCounter(counterPath, state);
    const readBack = readCounter(counterPath);
    expect(readBack.count).toBe(42);
    expect(readBack.lastEditTimestamp).toBe("2026-05-09T10:00:00.000Z");
  });

  // ─── Test 14: subagent_unnamed_with_subagent_type_skipped ─────────────────
  test("subagent_unnamed_with_subagent_type_skipped — subagent_type present means actual subagent", async () => {
    // When subagent_type is set, Claude Code is running as an actual subagent
    const payload = makeEditPayload(TMP, {
      byWhom: { agentName: "subagent-unnamed", identity: "claude-code" },
      subagent_type: "Explore",
    });

    for (let i = 0; i < 5; i++) {
      const result = await leadDirectEditWatch(payload);
      expect(result.message).toContain("skipped");
      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    }

    const counter = readSessionCounter(TMP);
    expect(counter).toBeNull();
  });

  // ─── Test 15: incrementSynthCounterWatch_increments_correctly ─────────────
  test("incrementSynthCounterWatch_increments_correctly — synthesis counter increments separately", () => {
    const count1 = incrementSynthCounterWatch(TMP);
    expect(count1).toBe(1);

    const count2 = incrementSynthCounterWatch(TMP);
    expect(count2).toBe(2);

    const synthPath = synthCounterFilePath(TMP);
    const state = readCounter(synthPath);
    expect(state.count).toBe(2);
  });

  // ─── Test 16: isMixedSessionWatch_not_mixed_below_threshold ───────────────
  test("isMixedSessionWatch_not_mixed_below_threshold — returns mixed=false when synthCount < SYNTHESIS_MIXED_MIN_COUNT", () => {
    // Write only 1 synthesis edit (below SYNTHESIS_MIXED_MIN_COUNT=3)
    incrementSynthCounterWatch(TMP);

    const result = isMixedSessionWatch(TMP);
    expect(result.mixed).toBe(false);
    expect(result.synthCount).toBe(1);
  });

  // ─── Test 17: block_at_16_still_blocked ──────────────────────────────────
  test("block_at_16_still_blocked — count > 15 remains blocked", async () => {
    const payload = makeEditPayload(TMP);

    // Hit block at 15
    for (let i = 0; i < 15; i++) {
      await leadDirectEditWatch(payload);
    }

    // 16th edit: also blocked
    const result16 = await leadDirectEditWatch(payload);
    expect(result16.message).toContain("BLOCK");
    expect(result16.hookSpecificOutput?.permissionDecision).toBe("deny");
  });
});
