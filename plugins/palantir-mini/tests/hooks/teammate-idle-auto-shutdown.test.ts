// palantir-mini v1.1 — teammate-idle auto-shutdown tests
// Defect #4 coverage: idleCount >= 3 && blockedByDepth > 1 => shutdown_request.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import teammateIdle, {
  AUTO_SHUTDOWN_IDLE_THRESHOLD,
  AUTO_SHUTDOWN_BLOCKED_THRESHOLD,
} from "../../hooks/teammate-idle";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ti-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

describe("teammate-idle auto-shutdown", () => {
  let tmpRoot: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpProject("auto-shutdown");
    savedEnv.PALANTIR_MINI_PROJECT           = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE       = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.PALANTIR_MINI_SKIP_DRIFT_WATCH  = process.env.PALANTIR_MINI_SKIP_DRIFT_WATCH;
    process.env.PALANTIR_MINI_PROJECT          = tmpRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE      = eventsPathFor(tmpRoot);
    process.env.PALANTIR_MINI_SKIP_DRIFT_WATCH = "1";
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("threshold constants wired correctly", () => {
    expect(AUTO_SHUTDOWN_IDLE_THRESHOLD).toBe(3);
    expect(AUTO_SHUTDOWN_BLOCKED_THRESHOLD).toBe(1);
  });

  test("idleCount=1, blockedBy=0 — no shutdown", async () => {
    const res = await teammateIdle({
      agent_id: "a1",
      idle_count: 1,
      blocked_by_depth: 0,
      cwd: tmpRoot,
    });
    expect(res.message).toContain("agent=a1");
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "shutdown_request")).toBe(false);
    expect(events.some((e) => e.type === "teammate_idle")).toBe(true);
  });

  test("idleCount=2, blockedBy=2 — no shutdown (idle below threshold)", async () => {
    await teammateIdle({ agent_id: "a2", idle_count: 2, blocked_by_depth: 2, cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "shutdown_request")).toBe(false);
  });

  test("idleCount=3, blockedBy=1 — no shutdown (one-level blocked stays warm)", async () => {
    await teammateIdle({ agent_id: "a3", idle_count: 3, blocked_by_depth: 1, cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "shutdown_request")).toBe(false);
  });

  test("idleCount=3, blockedBy=2 — shutdown_request emitted", async () => {
    const res = await teammateIdle({ agent_id: "a4", idle_count: 3, blocked_by_depth: 2, cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    const shutdown = events.find((e) => e.type === "shutdown_request");
    expect(shutdown).toBeDefined();
    expect((shutdown!.payload as { agentId: string }).agentId).toBe("a4");
    expect((shutdown!.payload as { reason: string }).reason).toBe("auto-idle-shutdown");
    expect(res.additionalContext).toContain("auto-shutdown requested");
  });

  test("idleCount=4, blockedBy=3 — shutdown_request with full metadata", async () => {
    await teammateIdle({ agent_id: "deep-blocked", idle_count: 4, blocked_by_depth: 3, cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    const shutdown = events.find((e) => e.type === "shutdown_request");
    expect(shutdown).toBeDefined();
    const p = shutdown!.payload as { agentId: string; idleCount: number; blockedByDepth: number };
    expect(p.agentId).toBe("deep-blocked");
    expect(p.idleCount).toBe(4);
    expect(p.blockedByDepth).toBe(3);
  });

  test("missing agent_id falls back to 'unknown'", async () => {
    const res = await teammateIdle({ idle_count: 0, blocked_by_depth: 0, cwd: tmpRoot });
    expect(res.message).toContain("agent=unknown");
  });

  test("teammate_idle always emitted regardless of thresholds", async () => {
    await teammateIdle({ agent_id: "idle-emit", idle_count: 0, blocked_by_depth: 0, cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.filter((e) => e.type === "teammate_idle")).toHaveLength(1);
  });
});
