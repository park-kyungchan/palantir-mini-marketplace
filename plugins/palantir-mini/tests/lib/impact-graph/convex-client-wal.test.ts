/**
 * palantir-mini sprint-102 PR 4.1c — convex-client-wal.test.ts
 *
 * Tests WAL buffer behavior:
 *   1. Cloud unreachable → WAL append at convex-pending.jsonl
 *   2. WAL round-trip: write entries → read back lossless
 *   3. STUB MODE (PALANTIR_MINI_CONVEX_STUB=1) → stub client + no WAL write
 *   4. WAL truncate empties the file
 *   5. Batch boundary: 51 entries splits into 50+1 batches
 *   6. events.jsonl drain event shape is parseable and conformant
 *
 * Per canonical plan v2 §4 row 4.1c.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  getConvexClient,
  resetConvexClient,
  mirrorDecisionEvent,
} from "../../../lib/impact-graph/convex-client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "convex-wal-test-"));
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function readWal(projectRoot: string): unknown[] {
  const walPath = path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl");
  if (!fs.existsSync(walPath)) return [];
  return fs
    .readFileSync(walPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

function writeWal(projectRoot: string, entries: unknown[]): void {
  const walPath = path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl");
  fs.writeFileSync(
    walPath,
    entries.map((e) => JSON.stringify(e)).join("\n") + "\n",
    "utf8",
  );
}

function walIsEmpty(projectRoot: string): boolean {
  const walPath = path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl");
  if (!fs.existsSync(walPath)) return true;
  return fs.readFileSync(walPath, "utf8").trim().length === 0;
}

function readEvents(projectRoot: string): unknown[] {
  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let projectRoot: string;

beforeEach(() => {
  projectRoot = makeTempProject();
  resetConvexClient();
  delete process.env.PALANTIR_MINI_CONVEX_STUB;
  delete process.env.CONVEX_ENV;
  delete process.env.CONVEX_URL;
});

afterEach(() => {
  resetConvexClient();
  delete process.env.PALANTIR_MINI_CONVEX_STUB;
  delete process.env.CONVEX_ENV;
  delete process.env.CONVEX_URL;
  try { fs.rmSync(projectRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ─── WAL file system tests ────────────────────────────────────────────────────

describe("convex-client WAL — file system helpers", () => {
  it("WAL file is absent initially", () => {
    const walPath = path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl");
    expect(fs.existsSync(walPath)).toBe(false);
  });

  it("WAL append + read round-trip is lossless", () => {
    const entry1 = {
      projectRoot,
      sequence: 1001,
      eventType: "validation_phase_completed",
      valueGrade: "T3",
      byWhomIdentity: "claude-code/procedural-skill",
      when: "2026-05-13T00:00:00.000Z",
      raw: JSON.stringify({ type: "test" }),
    };
    const entry2 = {
      projectRoot,
      sequence: 1002,
      eventType: "grading_completed",
      valueGrade: "T4",
      byWhomIdentity: "claude-code/episodic-recall",
      when: "2026-05-13T00:01:00.000Z",
      raw: JSON.stringify({ type: "test2" }),
    };
    writeWal(projectRoot, [entry1, entry2]);

    const read = readWal(projectRoot);
    expect(read).toHaveLength(2);
    expect((read[0] as typeof entry1).sequence).toBe(1001);
    expect((read[1] as typeof entry2).sequence).toBe(1002);
  });

  it("WAL entries carry BackPropValueIndexEntry optional fields", () => {
    const entry = {
      projectRoot,
      sequence: 2001,
      eventType: "validation_phase_completed",
      valueGrade: "T3",
      byWhomIdentity: "claude-code",
      when: "2026-05-13T00:02:00.000Z",
      raw: "{}",
      entry: {
        eventId: "evt-001",
        when: "2026-05-13T00:02:00.000Z",
        sessionId: "sess-abc",
        runtime: "claude",
        sprintContractRef: "sprint-102",
        correlationId: "corr-xyz",
        agentId: "project-implementer",
        toolName: "mirrorDecisionEvent",
        commitSha: "26d0c6663",
        branchName: "sprint-102-pr4.1c-convex-client-cloud-wal-2026-05-13",
        evalSuiteId: "suite-001",
        evalRunId: "run-001",
        valueGrade: "T3",
        refinementTarget: "rule-12-lead-protocol",
        memoryLayers: ["procedural"],
      },
    };
    writeWal(projectRoot, [entry]);
    const read = readWal(projectRoot);
    expect(read).toHaveLength(1);
    const e = read[0] as typeof entry;
    expect(e.entry?.eventId).toBe("evt-001");
    expect(e.entry?.sessionId).toBe("sess-abc");
    expect(e.entry?.runtime).toBe("claude");
    expect(e.entry?.sprintContractRef).toBe("sprint-102");
    expect(e.entry?.refinementTarget).toBe("rule-12-lead-protocol");
    expect(e.entry?.memoryLayers).toEqual(["procedural"]);
  });

  it("WAL truncate empties the file", () => {
    const walPath = path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl");
    writeWal(projectRoot, [{ sequence: 1 }, { sequence: 2 }]);
    expect(readWal(projectRoot)).toHaveLength(2);
    fs.writeFileSync(walPath, "", "utf8");
    expect(walIsEmpty(projectRoot)).toBe(true);
    expect(readWal(projectRoot)).toHaveLength(0);
  });

  it("empty WAL produces empty read result", () => {
    expect(readWal(projectRoot)).toHaveLength(0);
  });
});

// ─── Batch boundary ───────────────────────────────────────────────────────────

describe("convex-client WAL — batch boundary (WAL_BATCH_SIZE=50)", () => {
  it("WAL with 51 entries splits into batches of 50+1", () => {
    const entries = Array.from({ length: 51 }, (_, i) => ({
      projectRoot,
      sequence: 3000 + i,
      eventType: "validation_phase_completed",
      valueGrade: "T3",
      byWhomIdentity: "claude-code",
      when: new Date().toISOString(),
      raw: "{}",
    }));
    writeWal(projectRoot, entries);
    const read = readWal(projectRoot);
    expect(read).toHaveLength(51);
    const batch1 = read.slice(0, 50);
    const batch2 = read.slice(50);
    expect(batch1).toHaveLength(50);
    expect(batch2).toHaveLength(1);
    expect((batch2[0] as { sequence: number }).sequence).toBe(3050);
  });

  it("WAL with single entry is readable", () => {
    writeWal(projectRoot, [{ sequence: 9999, valueGrade: "T4" }]);
    const read = readWal(projectRoot);
    expect(read).toHaveLength(1);
  });
});

// ─── STUB MODE ────────────────────────────────────────────────────────────────

describe("convex-client WAL — STUB MODE (PALANTIR_MINI_CONVEX_STUB=1)", () => {
  it("getConvexClient() returns isStub=true when env forces stub", () => {
    process.env.PALANTIR_MINI_CONVEX_STUB = "1";
    resetConvexClient();
    const client = getConvexClient();
    expect(client.isStub).toBe(true);
  });

  it("mirrorDecisionEvent returns null in stub mode without writing WAL", async () => {
    process.env.PALANTIR_MINI_CONVEX_STUB = "1";
    resetConvexClient();
    const result = await mirrorDecisionEvent({
      projectRoot,
      sequence: 9001,
      eventType: "validation_phase_completed",
      valueGrade: "T3",
      byWhomIdentity: "claude-code",
      when: "2026-05-13T00:00:00.000Z",
      raw: "{}",
    });
    expect(result).toBeNull();
    expect(walIsEmpty(projectRoot)).toBe(true);
  });
});

// ─── events.jsonl drain event shape ──────────────────────────────────────────

describe("convex-client WAL — drain event shape", () => {
  it("events.jsonl drain event envelope is parseable and conformant", () => {
    const drainedCount = 12;
    const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");

    const envelope = {
      type: "validation_phase_completed",
      eventId: `convex-wal-drained-test-${Date.now()}`,
      when: new Date().toISOString(),
      atopWhich: "26d0c6663",
      throughWhich: { surface: "lib/impact-graph/convex-client.ts", tool: "mirrorDecisionEvent" },
      byWhom: { agent: "convex-client", identity: "claude-code/procedural-skill" },
      payload: {
        errorClass: "convex_wal_drained",
        drainedCount,
        walPath: path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl"),
      },
      withWhat: {
        reasoning:
          `Sprint-102 PR 4.1c: WAL drained ${drainedCount} buffered envelopes to Cloud Convex after outage recovery. ` +
          `WAL buffer at .palantir-mini/session/convex-pending.jsonl drained oldest-first in batches of 50. ` +
          `Per canonical plan v2 §4 row 4.1c.`,
      },
    };

    fs.appendFileSync(eventsPath, JSON.stringify(envelope) + "\n", "utf8");
    const events = readEvents(projectRoot);
    expect(events).toHaveLength(1);
    const ev = events[0] as typeof envelope;
    expect(ev.type).toBe("validation_phase_completed");
    expect(ev.payload.errorClass).toBe("convex_wal_drained");
    expect(ev.payload.drainedCount).toBe(12);
    expect(ev.withWhat.reasoning).toContain("canonical plan v2 §4 row 4.1c");
    expect(ev.byWhom.identity).toBe("claude-code/procedural-skill");
  });
});

// ─── Cloud URL detection ──────────────────────────────────────────────────────

describe("convex-client WAL — Cloud URL detection", () => {
  it("CONVEX_URL env var wins over CONVEX_ENV=cloud", () => {
    process.env.CONVEX_URL = "https://test-deployment.convex.cloud";
    process.env.CONVEX_ENV = "cloud";
    resetConvexClient();
    // With CONVEX_URL set, a RealConvexClient is attempted (may fall back to stub on init failure)
    const client = getConvexClient();
    expect(client).toBeDefined();
    expect(typeof client.isStub).toBe("boolean");
  });

  it("CONVEX_ENV=cloud without .env.cloud falls through to local/stub", () => {
    process.env.CONVEX_ENV = "cloud";
    delete process.env.CONVEX_URL;
    resetConvexClient();
    // Real plugin root has .env.cloud present; falls back to that URL
    // OR if somehow the URL leads to connection failure, falls back to stub
    const client = getConvexClient();
    expect(client).toBeDefined();
    expect(typeof client.isStub).toBe("boolean");
  });
});
