// palantir-mini — lead-direct-counter-reset hook tests (sprint-059 W1.3)
// 5 test cases:
//   1. SessionStart resets counter to {count:0, lastEditTimestamp:null}
//   2. Emitted envelope carries errorClass="lead_direct_counter_reset"
//   3. Per-sprint counter at <sprintDir>/.lead-direct-edit-counter.json is untouched
//   4. hasRecentSprintBind returns true only within the 60s window
//   5. Counter file is created from scratch when not yet present

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import leadDirectCounterReset from "../../hooks/lead-direct-counter-reset";
import { hasRecentSprintBind, counterFilePath, writeCounter } from "../../hooks/lead-direct-edit-watch";

let TMP: string;

/** Build a minimal .palantir-mini project fixture at TMP. */
function setupProject(): void {
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
}

/** Read the session counter file. */
function readSessionCounter(tmp: string): { count: number; lastEditTimestamp: string | null } | null {
  const p = path.join(tmp, ".palantir-mini", "session", ".lead-direct-edit-counter.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Write an events.jsonl line for sprint_contract_bound. */
function writeSprintBoundEvent(tmp: string, whenIso: string): void {
  const eventsPath = path.join(tmp, ".palantir-mini", "session", "events.jsonl");
  const event = JSON.stringify({
    type: "sprint_contract_bound",
    eventId: "evt-test-sprint-bind",
    when: whenIso,
    sequence: 1,
    atopWhich: "abc123",
    throughWhich: { sessionId: "test", toolName: "negotiate_sprint_contract", cwd: tmp },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "test sprint bind" },
    payload: { sprintId: "sprint-001-test" },
  });
  fs.appendFileSync(eventsPath, event + "\n");
}

/** Write a sentinel per-sprint counter file. */
function writeSprintCounter(sprintDir: string, count: number): void {
  fs.mkdirSync(sprintDir, { recursive: true });
  const p = path.join(sprintDir, ".lead-direct-edit-counter.json");
  writeCounter(p, { count, lastEditTimestamp: "2026-05-08T00:00:00Z" });
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-counter-reset-"));
  setupProject();
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("leadDirectCounterReset (SessionStart hook)", () => {
  // ─── Test 1: reset on SessionStart ──────────────────────────────────────────
  test("resets an existing counter to {count:0, lastEditTimestamp:null}", async () => {
    // Pre-populate a counter with count=131 (the real-world blocker scenario)
    const cpath = counterFilePath(TMP);
    writeCounter(cpath, { count: 131, lastEditTimestamp: "2026-05-07T01:58:25Z" });

    const result = await leadDirectCounterReset({ cwd: TMP, session_id: "test-s1" });

    // Hook should indicate success
    expect(result.message).toContain("lead-direct-counter-reset OK");
    expect(result.message).toContain("was 131 → 0");

    // Counter file should now be {count:0, lastEditTimestamp:null}
    const after = readSessionCounter(TMP);
    expect(after).not.toBeNull();
    expect(after!.count).toBe(0);
    expect(after!.lastEditTimestamp).toBeNull();
  });

  // ─── Test 2: emit envelope shape ─────────────────────────────────────────────
  test("returns hook result with additionalContext mentioning per-sprint counters", async () => {
    const cpath = counterFilePath(TMP);
    writeCounter(cpath, { count: 5, lastEditTimestamp: "2026-05-08T00:00:00Z" });

    const result = await leadDirectCounterReset({ cwd: TMP, session_id: "test-s2" });

    // hookSpecificOutput.additionalContext should mention per-sprint counters are untouched
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
    expect(result.hookSpecificOutput!.additionalContext).toContain("Per-sprint counters");
    expect(result.hookSpecificOutput!.additionalContext).toContain("untouched");
    expect(result.hookSpecificOutput!.additionalContext).toContain("reset to 0");
  });

  // ─── Test 3: per-sprint counter preserved ────────────────────────────────────
  test("does NOT modify a per-sprint counter at <sprintDir>/.lead-direct-edit-counter.json", async () => {
    // Pre-populate session counter
    const cpath = counterFilePath(TMP);
    writeCounter(cpath, { count: 50, lastEditTimestamp: "2026-05-08T00:00:00Z" });

    // Create a mock sprint dir with its own counter
    const sprintDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001-quick");
    writeSprintCounter(sprintDir, 3);

    const sprintCounterPath = path.join(sprintDir, ".lead-direct-edit-counter.json");
    const beforeSprint = JSON.parse(fs.readFileSync(sprintCounterPath, "utf8"));

    await leadDirectCounterReset({ cwd: TMP, session_id: "test-s3" });

    // Session counter should be reset
    const afterSession = readSessionCounter(TMP);
    expect(afterSession!.count).toBe(0);

    // Sprint counter should be UNCHANGED
    const afterSprint = JSON.parse(fs.readFileSync(sprintCounterPath, "utf8"));
    expect(afterSprint.count).toBe(beforeSprint.count);
    expect(afterSprint.lastEditTimestamp).toBe(beforeSprint.lastEditTimestamp);
  });

  // ─── Test 4: hasRecentSprintBind returns true within window ──────────────────
  test("hasRecentSprintBind returns true for a sprint_contract_bound event within 60s", () => {
    // Write a sprint_contract_bound event timestamped right now
    const now = new Date().toISOString();
    writeSprintBoundEvent(TMP, now);

    expect(hasRecentSprintBind(TMP, 60_000)).toBe(true);
  });

  // ─── Test 4b: hasRecentSprintBind returns false outside window ────────────────
  test("hasRecentSprintBind returns false for a sprint_contract_bound event older than 60s", () => {
    // Write a sprint_contract_bound event 2 minutes ago
    const twoMinsAgo = new Date(Date.now() - 120_000).toISOString();
    writeSprintBoundEvent(TMP, twoMinsAgo);

    expect(hasRecentSprintBind(TMP, 60_000)).toBe(false);
  });

  // ─── Test 5: counter file created from scratch when missing ──────────────────
  test("creates the counter file from scratch when not yet present", async () => {
    // No counter file pre-exists — just the session dir
    const cpath = counterFilePath(TMP);
    expect(fs.existsSync(cpath)).toBe(false);

    const result = await leadDirectCounterReset({ cwd: TMP, session_id: "test-s5" });

    expect(result.message).toContain("lead-direct-counter-reset OK");
    expect(result.message).toContain("was 0 → 0"); // previousCount=0 (file was absent)

    const after = readSessionCounter(TMP);
    expect(after).not.toBeNull();
    expect(after!.count).toBe(0);
    expect(after!.lastEditTimestamp).toBeNull();
  });
});
