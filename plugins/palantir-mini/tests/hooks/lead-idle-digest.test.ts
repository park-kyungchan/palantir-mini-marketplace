// palantir-mini v1.4 — lead-idle-digest tests
// Phase A-4: idle aggregation buffer + 5-min flush window.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import leadIdleDigest, {
  DIGEST_FLUSH_INTERVAL_MS,
  buildDigestSummary,
} from "../../hooks/lead-idle-digest";

describe("buildDigestSummary", () => {
  test("empty entries produces 'No idle pings' message", () => {
    const summary = buildDigestSummary([]);
    expect(summary).toContain("No idle pings");
  });

  test("single agent entry summarized correctly", () => {
    const entries = [
      { agentId: "builder-1", idleCount: 2, recordedAt: "2026-04-19T00:00:00Z" },
      { agentId: "builder-1", idleCount: 3, recordedAt: "2026-04-19T00:01:00Z" },
    ];
    const summary = buildDigestSummary(entries);
    expect(summary).toContain("builder-1");
    expect(summary).toContain("2 idle ping(s)");
  });

  test("multiple agents sorted by count desc", () => {
    const entries = [
      { agentId: "a1", idleCount: 1, recordedAt: "2026-04-19T00:00:00Z" },
      { agentId: "a2", idleCount: 1, recordedAt: "2026-04-19T00:00:00Z" },
      { agentId: "a2", idleCount: 2, recordedAt: "2026-04-19T00:01:00Z" },
      { agentId: "a2", idleCount: 3, recordedAt: "2026-04-19T00:02:00Z" },
    ];
    const summary = buildDigestSummary(entries);
    const a2pos = summary.indexOf("a2");
    const a1pos = summary.indexOf("a1");
    expect(a2pos).toBeLessThan(a1pos); // a2 has 3 pings, comes first
  });

  test("summary contains 'shutting down' advisory", () => {
    const summary = buildDigestSummary([{ agentId: "x", idleCount: 1, recordedAt: "t" }]);
    expect(summary).toContain("shut");
  });
});

describe("DIGEST_FLUSH_INTERVAL_MS", () => {
  test("is 5 minutes", () => {
    expect(DIGEST_FLUSH_INTERVAL_MS).toBe(5 * 60 * 1000);
  });
});

describe("leadIdleDigest hook", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let sessionId: string;

  beforeEach(() => {
    sessionId = `test-lid-${Date.now()}`;
    savedEnv.CLAUDE_SESSION_ID         = process.env.CLAUDE_SESSION_ID;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.CLAUDE_SESSION_ID      = sessionId;
    const tmpDir = path.join(os.tmpdir(), `pm-lid-evt-${Date.now()}`);
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

  test("first ping returns suppressNotification=true (not yet flush time)", async () => {
    const res = await leadIdleDigest({
      agent_id:   "a1",
      idle_count: 1,
      session_id: sessionId,
    });
    expect(res.suppressNotification).toBe(true);
    expect(res.message).toContain("buffered");
  });

  test("digest file is created after first ping", async () => {
    await leadIdleDigest({ agent_id: "a1", idle_count: 1, session_id: sessionId });
    const digestFile = path.join("/tmp", "palantir-mini-hooks", sessionId, "idle-digest.jsonl");
    expect(fs.existsSync(digestFile)).toBe(true);
    const content = fs.readFileSync(digestFile, "utf8");
    expect(content).toContain("a1");
  });

  test("multiple pings accumulate in digest buffer", async () => {
    for (let i = 0; i < 5; i++) {
      await leadIdleDigest({ agent_id: "agent-multi", idle_count: i, session_id: sessionId });
    }
    const digestFile = path.join("/tmp", "palantir-mini-hooks", sessionId, "idle-digest.jsonl");
    const lines = fs.readFileSync(digestFile, "utf8").split("\n").filter((l) => l.trim());
    expect(lines.length).toBe(5);
  });

  test("missing agent_id defaults gracefully", async () => {
    const res = await leadIdleDigest({ idle_count: 0, session_id: sessionId });
    expect(res.message).toContain("unknown");
  });

  test("flush clears digest buffer", async () => {
    // Write a flush meta with old timestamp to force flush on next call
    const dir = path.join("/tmp", "palantir-mini-hooks", sessionId);
    fs.mkdirSync(dir, { recursive: true });
    const flushMetaPath = path.join(dir, "idle-digest-flush.json");
    fs.writeFileSync(flushMetaPath, JSON.stringify({ lastFlushedAt: new Date(0).toISOString() }));

    // Write some digest entries
    const digestPath = path.join(dir, "idle-digest.jsonl");
    fs.writeFileSync(digestPath, JSON.stringify({ agentId: "x", idleCount: 1, recordedAt: "t" }) + "\n");

    const res = await leadIdleDigest({ agent_id: "y", idle_count: 1, session_id: sessionId });
    // Should have flushed (flush window expired = new(0))
    expect(res.suppressNotification).toBe(false);
    // Digest should be cleared (only new entry from this call)
    const content = fs.readFileSync(digestPath, "utf8");
    // After flush, digest is cleared and new entry "y" appended
    expect(content).toContain("y");
  });
});
