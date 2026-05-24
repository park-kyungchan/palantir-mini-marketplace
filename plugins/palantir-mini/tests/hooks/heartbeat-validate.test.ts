// palantir-mini v1.4 — heartbeat-validate tests
// Phase A-4: stuck-agent detection via event-log activity scan.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import heartbeatValidate, {
  DEFAULT_HEARTBEAT_TIMEOUT_MIN,
  HEARTBEAT_EVENT_TYPES,
  findLastHeartbeatTime,
  isStuck,
} from "../../hooks/heartbeat-validate";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-hbv-${label}-`));
}

describe("DEFAULT_HEARTBEAT_TIMEOUT_MIN", () => {
  test("defaults to 10 minutes", () => {
    expect(DEFAULT_HEARTBEAT_TIMEOUT_MIN).toBe(10);
  });
});

describe("HEARTBEAT_EVENT_TYPES", () => {
  test("includes edit_committed", () => expect(HEARTBEAT_EVENT_TYPES.has("edit_committed")).toBe(true));
  test("includes phase_completed", () => expect(HEARTBEAT_EVENT_TYPES.has("phase_completed")).toBe(true));
  test("includes task_created",    () => expect(HEARTBEAT_EVENT_TYPES.has("task_created")).toBe(true));
  test("includes agent_stop",      () => expect(HEARTBEAT_EVENT_TYPES.has("agent_stop")).toBe(true));
});

describe("findLastHeartbeatTime", () => {
  test("returns null for empty events", () => {
    expect(findLastHeartbeatTime([])).toBeNull();
  });

  test("returns null when no heartbeat events match", () => {
    const events = [{ type: "unknown_event", when: "2026-04-19T00:00:00Z" }];
    expect(findLastHeartbeatTime(events)).toBeNull();
  });

  test("returns the most recent heartbeat timestamp", () => {
    const events = [
      { type: "phase_completed",   when: "2026-04-19T00:00:00Z", byWhom: { agentName: "a" } },
      { type: "edit_committed",    when: "2026-04-19T00:10:00Z", byWhom: { agentName: "a" } },
      { type: "validation_phase_completed", when: "2026-04-19T00:05:00Z", byWhom: { agentName: "a" } },
    ];
    const t = findLastHeartbeatTime(events);
    expect(t?.toISOString()).toBe("2026-04-19T00:10:00.000Z");
  });

  test("ignores events with invalid timestamps", () => {
    const events = [
      { type: "phase_completed", when: "not-a-date", byWhom: { agentName: "a" } },
      { type: "edit_committed",  when: "2026-04-19T01:00:00Z", byWhom: { agentName: "a" } },
    ];
    const t = findLastHeartbeatTime(events);
    expect(t?.toISOString()).toBe("2026-04-19T01:00:00.000Z");
  });
});

describe("isStuck", () => {
  test("returns true when lastHeartbeat is null (never emitted)", () => {
    expect(isStuck(null, 10)).toBe(true);
  });

  test("returns false when within timeout window", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    expect(isStuck(recent, 10)).toBe(false);
  });

  test("returns true when past timeout window", () => {
    const old = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
    expect(isStuck(old, 10)).toBe(true);
  });

  test("exactly at threshold is considered stuck", () => {
    const at = new Date(Date.now() - 10 * 60 * 1000); // exactly 10 min ago
    expect(isStuck(at, 10)).toBe(true);
  });
});

describe("heartbeatValidate hook", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir("hook");
    savedEnv.PALANTIR_MINI_PROJECT        = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE    = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.PALANTIR_MINI_HEARTBEAT_TIMEOUT_MIN = process.env.PALANTIR_MINI_HEARTBEAT_TIMEOUT_MIN;
    process.env.PALANTIR_MINI_PROJECT     = tmpDir;
    const eventsDir = path.join(tmpDir, ".palantir-mini", "session");
    fs.mkdirSync(eventsDir, { recursive: true });
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(eventsDir, "events.jsonl");
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("agent with recent activity is not stuck", async () => {
    const eventsFile = path.join(tmpDir, ".palantir-mini", "session", "events.jsonl");
    const recentTs   = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    fs.writeFileSync(eventsFile, JSON.stringify({
      type:    "phase_completed",
      when:    recentTs,
      byWhom:  { agentName: "active-agent" },
      payload: {},
    }) + "\n");

    const res = await heartbeatValidate({ agent_name: "active-agent", cwd: tmpDir });
    expect(res.message).toContain("OK");
    expect(res.additionalContext).toBeUndefined();
  });

  test("agent with no events is stuck and receives prompt", async () => {
    // events.jsonl empty
    const res = await heartbeatValidate({
      agent_name: "stuck-agent",
      cwd:        tmpDir,
    });
    expect(res.message).toContain("STUCK");
    expect(res.additionalContext).toContain("MANDATORY STATUS CHECK");
  });

  test("custom timeout respected via env var", async () => {
    process.env.PALANTIR_MINI_HEARTBEAT_TIMEOUT_MIN = "1";
    const eventsFile = path.join(tmpDir, ".palantir-mini", "session", "events.jsonl");
    // Activity 90 seconds ago (past 1-min timeout)
    const oldTs = new Date(Date.now() - 90_000).toISOString();
    fs.writeFileSync(eventsFile, JSON.stringify({
      type:    "edit_committed",
      when:    oldTs,
      byWhom:  { agentName: "timed-out-agent" },
      payload: {},
    }) + "\n");

    const res = await heartbeatValidate({ agent_name: "timed-out-agent", cwd: tmpDir });
    expect(res.message).toContain("STUCK");
  });

  test("missing agent_name uses agent_id", async () => {
    const res = await heartbeatValidate({ agent_id: "fallback-agent", cwd: tmpDir });
    expect(res.message).toContain("fallback-agent");
  });
});
