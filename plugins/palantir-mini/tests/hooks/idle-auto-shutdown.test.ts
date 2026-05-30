// palantir-mini v3.7.0 — idle-auto-shutdown tests (main)
// Coverage: constants + idle-state persistence + idleAutoShutdown hook.
// Decomposed in v3.7.0 A.4: B-17 pair-tracker → -pair-tracker.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import idleAutoShutdown, {
  IDLE_SHUTDOWN_THRESHOLD,
  readIdleState,
  writeIdleState,
  resetAgentIdleState,
} from "../../hooks/idle-auto-shutdown";

describe("idle-auto-shutdown constants", () => {
  test("IDLE_SHUTDOWN_THRESHOLD is 3", () => {
    expect(IDLE_SHUTDOWN_THRESHOLD).toBe(3);
  });
});

describe("idle state persistence helpers", () => {
  let sessionId: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    sessionId = `test-session-${Date.now()}`;
    savedEnv.CLAUDE_SESSION_ID = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = sessionId;
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    const dir = path.join("/tmp", "palantir-mini-hooks", sessionId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  test("readIdleState returns empty object when no file exists", () => {
    const state = readIdleState(`nonexistent-session-${Date.now()}`);
    expect(state).toEqual({});
  });

  test("writeIdleState + readIdleState round-trips correctly", () => {
    const state = { "agent-1": { idleCount: 5, lastUpdatedAt: "2026-04-19T00:00:00Z" } };
    writeIdleState(sessionId, state);
    const back = readIdleState(sessionId);
    expect(back["agent-1"]?.idleCount).toBe(5);
  });

  test("resetAgentIdleState removes the agent entry", () => {
    writeIdleState(sessionId, {
      "agent-a": { idleCount: 2, lastUpdatedAt: "2026-04-19T00:00:00Z" },
      "agent-b": { idleCount: 1, lastUpdatedAt: "2026-04-19T00:00:00Z" },
    });
    resetAgentIdleState(sessionId, "agent-a");
    const back = readIdleState(sessionId);
    expect(back["agent-a"]).toBeUndefined();
    expect(back["agent-b"]).toBeDefined();
  });
});

describe("idleAutoShutdown hook", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let sessionId: string;

  beforeEach(() => {
    sessionId = `test-ias-${Date.now()}`;
    savedEnv.CLAUDE_SESSION_ID         = process.env.CLAUDE_SESSION_ID;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.CLAUDE_SESSION_ID      = sessionId;
    const tmpDir = path.join(os.tmpdir(), `pm-ias-evt-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpDir, "events.jsonl");
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    const dir = path.join("/tmp", "palantir-mini-hooks", sessionId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    const evtFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    if (evtFile) {
      const evtDir = path.dirname(evtFile);
      if (fs.existsSync(evtDir)) fs.rmSync(evtDir, { recursive: true, force: true });
    }
  });

  test("low idle count does not trigger shutdown", async () => {
    const res = await idleAutoShutdown({
      agent_id:        "agent-x",
      idle_count:      1,
      blocked_by_depth: 2,
      available_tasks: 1,
      session_id:      sessionId,
    });
    expect(res.continue).toBeUndefined();
    expect(res.decision).toBe("continue");
  });

  test("idle >= 3 with available_tasks=0 triggers shutdown", async () => {
    const res = await idleAutoShutdown({
      agent_id:        "agent-y",
      idle_count:      3,
      blocked_by_depth: 2,
      available_tasks: 0,
      session_id:      sessionId,
    });
    expect(res.continue).toBe(false);
    expect(res.stopReason).toContain("auto-shutdown");
    expect(res.stopReason).toContain("agent-y");
  });

  test("idle >= 3 with blockedByDepth > 1 and unknown tasks triggers shutdown", async () => {
    const res = await idleAutoShutdown({
      agent_id:        "agent-z",
      idle_count:      4,
      blocked_by_depth: 3,
      session_id:      sessionId,
    });
    expect(res.continue).toBe(false);
  });

  test("idle >= 3 but available_tasks > 0 does not shutdown", async () => {
    const res = await idleAutoShutdown({
      agent_id:        "agent-busy",
      idle_count:      5,
      blocked_by_depth: 0,
      available_tasks: 3,
      session_id:      sessionId,
    });
    expect(res.continue).toBeUndefined();
    expect(res.decision).toBe("continue");
  });

  test("accumulated idle count persists across calls", async () => {
    const shared = { agent_id: "agent-accum", session_id: sessionId, available_tasks: 0 };

    await idleAutoShutdown({ ...shared, idle_count: 1, blocked_by_depth: 2 });
    const state1 = readIdleState(sessionId);
    expect(state1["agent-accum"]?.idleCount).toBeGreaterThanOrEqual(1);

    await idleAutoShutdown({ ...shared, idle_count: 2, blocked_by_depth: 2 });
    const res = await idleAutoShutdown({ ...shared, idle_count: 3, blocked_by_depth: 2 });
    expect(res.continue).toBe(false);
  });

  test("missing agent_id defaults to 'unknown'", async () => {
    const res = await idleAutoShutdown({ idle_count: 0, session_id: sessionId });
    expect(res.message).toContain("unknown");
  });
});
