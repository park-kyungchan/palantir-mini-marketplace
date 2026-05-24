// palantir-mini v3.7.0 — idle-auto-shutdown B-17 pair-tracker sibling (A.4 split)
// Coverage: agent_start ↔ subagent_stop pairing + orphan recovery.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  ORPHAN_TIMEOUT_MS,
  readPairTracker,
  recordAgentStart,
  recordSubagentStop,
  scanOrphans,
} from "../../hooks/idle-auto-shutdown";

describe("B-17 pair-tracker orphan recovery", () => {
  let sessionId: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    sessionId = `test-pt-${Date.now()}`;
    savedEnv.CLAUDE_SESSION_ID         = process.env.CLAUDE_SESSION_ID;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.PALANTIR_MINI_EVENTS_FILE_FORCE = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
    process.env.CLAUDE_SESSION_ID      = sessionId;
    const tmpDir = path.join(os.tmpdir(), `pm-pt-evt-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpDir, "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    const dir = path.join("/tmp", "claude-hooks", sessionId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    const evtFile = savedEnv.PALANTIR_MINI_EVENTS_FILE;
    if (evtFile === undefined && process.env.PALANTIR_MINI_EVENTS_FILE) {
      const evtDir = path.dirname(process.env.PALANTIR_MINI_EVENTS_FILE);
      if (fs.existsSync(evtDir)) fs.rmSync(evtDir, { recursive: true, force: true });
    }
  });

  test("ORPHAN_TIMEOUT_MS is 30 minutes", () => {
    expect(ORPHAN_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  test("recordAgentStart + readPairTracker round-trips correctly", () => {
    recordAgentStart(sessionId, "agent-α", "2026-04-25T10:00:00.000Z");
    const state = readPairTracker(sessionId);
    expect(state["agent-α"]?.resolved).toBe(false);
    expect(state["agent-α"]?.startTs).toBe("2026-04-25T10:00:00.000Z");
  });

  test("recordSubagentStop marks entry as resolved", () => {
    recordAgentStart(sessionId, "agent-β", "2026-04-25T10:00:00.000Z");
    recordSubagentStop(sessionId, "agent-β");
    const state = readPairTracker(sessionId);
    expect(state["agent-β"]?.resolved).toBe(true);
  });

  test("Case: agent_start without subagent_stop > 31min → synthetic subagent_stop emitted (timeout_recovery)", async () => {
    const startTs = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    recordAgentStart(sessionId, "orphan-agent", startTs);

    const recovered = await scanOrphans(sessionId, process.cwd(), Date.now());
    expect(recovered).toContain("orphan-agent");

    const state = readPairTracker(sessionId);
    expect(state["orphan-agent"]?.resolved).toBe(true);

    const evtFile = process.env.PALANTIR_MINI_EVENTS_FILE!;
    expect(fs.existsSync(evtFile)).toBe(true);
    const lines = fs.readFileSync(evtFile, "utf8").trim().split("\n").filter(Boolean);
    const stopEvent = lines.map((l) => JSON.parse(l)).find(
      (e) => e.type === "subagent_stop" && e.payload?.agentId === "orphan-agent",
    );
    expect(stopEvent).toBeDefined();
    expect(stopEvent.payload.reason).toBe("timeout_recovery");
  });

  test("Case: matched pair within 30min → no synthetic emission", async () => {
    const startTs = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    recordAgentStart(sessionId, "normal-agent", startTs);
    recordSubagentStop(sessionId, "normal-agent");

    const recovered = await scanOrphans(sessionId, process.cwd(), Date.now());
    expect(recovered).not.toContain("normal-agent");
    expect(recovered.length).toBe(0);

    const evtFile = process.env.PALANTIR_MINI_EVENTS_FILE!;
    const hasStopEvent = fs.existsSync(evtFile) &&
      fs.readFileSync(evtFile, "utf8").includes("normal-agent");
    expect(hasStopEvent).toBe(false);
  });

  test("unresolved entry within 30min window → not recovered (too early)", async () => {
    const startTs = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    recordAgentStart(sessionId, "recent-agent", startTs);

    const recovered = await scanOrphans(sessionId, process.cwd(), Date.now());
    expect(recovered).not.toContain("recent-agent");

    const state = readPairTracker(sessionId);
    expect(state["recent-agent"]?.resolved).toBe(false);
  });
});
