// palantir-mini v1.4 — session-duration-alarm tests
// Phase A-4: 3h warning + 4h Agent-spawn block.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import sessionDurationAlarm, {
  DEFAULT_WARN_SEC,
  DEFAULT_BLOCK_SEC,
  readAlarmState,
  writeAlarmState,
  resolveStartTime,
  elapsedSeconds,
} from "../../hooks/session-duration-alarm";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-sda-${label}-`));
}

describe("default threshold constants", () => {
  test("warn is 3 hours", () => expect(DEFAULT_WARN_SEC).toBe(3 * 3600));
  test("block is 4 hours", () => expect(DEFAULT_BLOCK_SEC).toBe(4 * 3600));
});

describe("elapsedSeconds", () => {
  test("recently started session has low elapsed time", () => {
    const start = new Date(Date.now() - 60_000); // 1 minute ago
    expect(elapsedSeconds(start)).toBeGreaterThanOrEqual(59);
    expect(elapsedSeconds(start)).toBeLessThan(65);
  });
});

describe("resolveStartTime", () => {
  let tmpDir: string;
  let sessionId: string;

  beforeEach(() => {
    tmpDir    = makeTmpDir("rst");
    sessionId = `test-sda-${Date.now()}`;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const hookDir = path.join("/tmp", "palantir-mini-hooks", sessionId);
    if (fs.existsSync(hookDir)) fs.rmSync(hookDir, { recursive: true, force: true });
  });

  test("resolves from first events.jsonl line 'when' field", () => {
    const eventsFile = path.join(tmpDir, "events.jsonl");
    const ts = "2026-04-19T01:00:00.000Z";
    fs.writeFileSync(eventsFile, JSON.stringify({ when: ts, type: "session_started" }) + "\n");
    const t = resolveStartTime(sessionId, eventsFile);
    expect(t?.toISOString()).toBe(ts);
  });

  test("falls back to alarm state when no events file", () => {
    writeAlarmState(sessionId, {
      sessionStartedAt: "2026-04-19T02:00:00.000Z",
      broadcastSent3h:  false,
    });
    const t = resolveStartTime(sessionId, "/nonexistent/events.jsonl");
    expect(t?.toISOString()).toBe("2026-04-19T02:00:00.000Z");
  });

  test("returns null when neither events nor alarm state present", () => {
    const t = resolveStartTime(`no-state-${Date.now()}`, "/nonexistent/events.jsonl");
    expect(t).toBeNull();
  });
});

describe("readAlarmState / writeAlarmState", () => {
  let sessionId: string;

  beforeEach(() => { sessionId = `test-sda-rw-${Date.now()}`; });
  afterEach(() => {
    const dir = path.join("/tmp", "palantir-mini-hooks", sessionId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  test("round-trips correctly", () => {
    writeAlarmState(sessionId, { sessionStartedAt: "2026-04-19T00:00:00Z", broadcastSent3h: false });
    const back = readAlarmState(sessionId);
    expect(back?.broadcastSent3h).toBe(false);
  });

  test("readAlarmState returns null when file missing", () => {
    expect(readAlarmState(`ghost-${Date.now()}`)).toBeNull();
  });
});

describe("sessionDurationAlarm hook", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let sessionId: string;
  let tmpEvents: string;
  let tmpEventsFile: string;

  beforeEach(() => {
    sessionId          = `test-sda-hook-${Date.now()}`;
    tmpEvents          = makeTmpDir("sda-hook");
    tmpEventsFile      = path.join(tmpEvents, "events.jsonl");

    savedEnv.CLAUDE_SESSION_ID                          = process.env.CLAUDE_SESSION_ID;
    savedEnv.PALANTIR_MINI_EVENTS_FILE                  = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC     = process.env.CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC;
    process.env.CLAUDE_SESSION_ID                       = sessionId;
    process.env.PALANTIR_MINI_EVENTS_FILE               = tmpEventsFile;
    delete process.env.CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC;
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpEvents, { recursive: true, force: true });
    const dir = path.join("/tmp", "palantir-mini-hooks", sessionId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  test("SessionStart event writes alarm state", async () => {
    const res = await sessionDurationAlarm({ event: "SessionStart", session_id: sessionId });
    expect(res.message).toContain("initialized");
    const state = readAlarmState(sessionId);
    expect(state).not.toBeNull();
    expect(state?.broadcastSent3h).toBe(false);
  });

  test("UserPromptSubmit with no start time returns skipped", async () => {
    const res = await sessionDurationAlarm({
      event:      "UserPromptSubmit",
      session_id: `ghost-${Date.now()}`,
      cwd:        tmpEvents,
    });
    expect(res.message).toContain("skipped");
  });

  test("well-under-threshold session returns continue", async () => {
    // Write events.jsonl with recent start
    const ts = new Date(Date.now() - 10_000).toISOString(); // 10 seconds ago
    fs.writeFileSync(tmpEventsFile, JSON.stringify({ when: ts, type: "session_started" }) + "\n");

    const res = await sessionDurationAlarm({
      event:      "UserPromptSubmit",
      session_id: sessionId,
      cwd:        tmpEvents,
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("OK");
  });

  test("short limit override: 3h-equivalent blocks agent spawn at 4h-threshold", async () => {
    // Override: limit = 60s, so warn at 45s, block at 60s
    process.env.CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC = "60";
    const ts = new Date(Date.now() - 65_000).toISOString(); // 65s ago (past 60s limit)
    fs.writeFileSync(tmpEventsFile, JSON.stringify({ when: ts, type: "session_started" }) + "\n");

    const res = await sessionDurationAlarm({
      event:      "UserPromptSubmit",
      tool_name:  "Agent",
      session_id: sessionId,
      cwd:        tmpEvents,
    });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("session-duration-alarm");
  });

  test("3h warn (via short override) sends broadcast and sets broadcastSent3h flag", async () => {
    // Override: limit = 80s, warn at 60s
    process.env.CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC = "80";
    const ts = new Date(Date.now() - 61_000).toISOString(); // 61s ago (past 75% = 60s)
    fs.writeFileSync(tmpEventsFile, JSON.stringify({ when: ts, type: "session_started" }) + "\n");
    writeAlarmState(sessionId, { sessionStartedAt: ts, broadcastSent3h: false });

    const res = await sessionDurationAlarm({
      event:      "UserPromptSubmit",
      session_id: sessionId,
      cwd:        tmpEvents,
    });
    // Should have warned
    expect(res.additionalContext).toBeDefined();
    expect(res.additionalContext).toContain("Terminate");

    // broadcastSent3h should be set
    const state = readAlarmState(sessionId);
    expect(state?.broadcastSent3h).toBe(true);

    // Second call should NOT re-broadcast
    const res2 = await sessionDurationAlarm({
      event:      "UserPromptSubmit",
      session_id: sessionId,
      cwd:        tmpEvents,
    });
    expect(res2.additionalContext).toBeUndefined();
  });
});
