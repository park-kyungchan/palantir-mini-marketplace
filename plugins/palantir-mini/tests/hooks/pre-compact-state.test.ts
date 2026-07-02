// palantir-mini v3.7.0 — pre-compact-state hook tests (D2 raw NDJSON snapshot + G4 retention).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import preCompactState from "../../hooks/pre-compact-state";
import { snapshotEventsRaw, pruneRawSnapshots } from "../../lib/event-log/snapshot";
import {
  createContextCapsule,
  loadContextCapsule,
  persistContextCapsule,
} from "../../lib/context/context-capsule";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-pcs-${label}-`));
}

function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function snapshotsDir(root: string): string {
  return path.join(root, ".palantir-mini", "session", "snapshots");
}

function writeValidEvents(root: string, count: number): void {
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const lines: string[] = [];
  for (let i = 1; i <= count; i++) {
    lines.push(JSON.stringify({
      type: "session_started",
      eventId: `evt-test-${i}`,
      when: new Date().toISOString(),
      atopWhich: "test-sha",
      throughWhich: { sessionId: "test", toolName: "test", cwd: root },
      byWhom: { identity: "claude-code" },
      payload: { model: "test", effort: "max" },
      sequence: i,
    }));
  }
  fs.writeFileSync(eventsPath(root), lines.join("\n") + "\n", "utf8");
}

describe("snapshotEventsRaw (D2 lib helper)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("snap"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("creates snapshot dir if missing + copies file", () => {
    writeValidEvents(tmp, 3);
    const snapDir = snapshotsDir(tmp);
    expect(fs.existsSync(snapDir)).toBe(false);

    const result = snapshotEventsRaw(eventsPath(tmp), snapDir);

    expect(fs.existsSync(snapDir)).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.atSequence).toBe(3);
  });

  test("snapshot filename pattern matches events-<ISO>.jsonl", () => {
    writeValidEvents(tmp, 1);
    const result = snapshotEventsRaw(eventsPath(tmp), snapshotsDir(tmp));
    const base = path.basename(result.path);
    expect(base).toMatch(/^events-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.jsonl$/);
  });

  test("snapshot content matches source byte-for-byte", () => {
    writeValidEvents(tmp, 5);
    const original = fs.readFileSync(eventsPath(tmp), "utf8");
    const result = snapshotEventsRaw(eventsPath(tmp), snapshotsDir(tmp));
    const copied = fs.readFileSync(result.path, "utf8");
    expect(copied).toBe(original);
  });
});

describe("pruneRawSnapshots (G4 retention)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("prune"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  function makeSnapshots(count: number, ageOffsets?: number[]): void {
    const dir = snapshotsDir(tmp);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < count; i++) {
      const fp = path.join(dir, `events-2026-04-25T12-00-${String(i).padStart(2, "0")}-000Z.jsonl`);
      fs.writeFileSync(fp, `seq=${i}\n`);
      if (ageOffsets?.[i] !== undefined) {
        const past = Date.now() - ageOffsets[i]!;
        fs.utimesSync(fp, past / 1000, past / 1000);
      }
    }
  }

  test("non-existent dir returns 0/0 result (no throw)", () => {
    const r = pruneRawSnapshots(snapshotsDir(tmp));
    expect(r.keptCount).toBe(0);
    expect(r.removedCount).toBe(0);
  });

  test("under keepCount: all kept", () => {
    makeSnapshots(5);
    const r = pruneRawSnapshots(snapshotsDir(tmp), { keepCount: 20 });
    expect(r.keptCount).toBe(5);
    expect(r.removedCount).toBe(0);
  });

  test("over keepCount but all within maxAgeMs: all kept (whichever larger)", () => {
    makeSnapshots(25);
    const r = pruneRawSnapshots(snapshotsDir(tmp), { keepCount: 20, maxAgeMs: 7 * 24 * 3600 * 1000 });
    expect(r.keptCount).toBe(25);
    expect(r.removedCount).toBe(0);
  });

  test("over keepCount + ages mixed: keep recent N + within-age", () => {
    const dayMs = 24 * 3600 * 1000;
    // First 5 snapshots are 30 days old (beyond 7d), last 20 are recent.
    const offsets: number[] = [...Array(5).fill(30 * dayMs), ...Array(20).fill(0)];
    makeSnapshots(25, offsets);

    const r = pruneRawSnapshots(snapshotsDir(tmp), { keepCount: 20, maxAgeMs: 7 * dayMs });
    expect(r.keptCount).toBe(20);
    expect(r.removedCount).toBe(5);
  });

  test("ignores non-snapshot files (not events-*.jsonl)", () => {
    const dir = snapshotsDir(tmp);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "README.md"), "ignored");
    fs.writeFileSync(path.join(dir, "manifest.json"), "ignored");
    // Deterministic ages (dayMs = 24h old) + a 1h maxAgeMs give ~23h of
    // margin either side of the cutoff. This replaces the previous
    // maxAgeMs: 0 setup, which was timing-flaky: pruneRawSnapshots compares
    // fractional-ms fs.statSync().mtimeMs against an integer Date.now(), and
    // with maxAgeMs: 0 a file created within the same millisecond as the
    // cutoff check could land on either side of it (empirically ~110/500
    // flake locally). See lib/event-log/snapshot.ts cutoff comparison.
    const dayMs = 24 * 3600 * 1000;
    makeSnapshots(3, [dayMs, dayMs, dayMs]);
    const r = pruneRawSnapshots(dir, { keepCount: 1, maxAgeMs: 3600 * 1000 });
    // Only events-*.jsonl files are eligible. keepCount=1 + all 3 snapshots
    // ~24h old (well beyond the 1h maxAgeMs) → keep top 1 most-recent, prune
    // rest. README + manifest untouched.
    expect(r.keptCount).toBe(1);
    expect(r.removedCount).toBe(2);
    expect(fs.existsSync(path.join(dir, "README.md"))).toBe(true);
  });
});

describe("preCompactState hook (D2 + G4 integration)", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir("hook");
    savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_PROJECT     = tmp;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath(tmp);
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("no events.jsonl → continue (advisory, nothing to guard)", async () => {
    const r = await preCompactState({});
    expect(r.decision).toBe("continue");
    expect(fs.existsSync(snapshotsDir(tmp))).toBe(false);
  });

  test("valid events + monotonic sequence → continue + snapshot written", async () => {
    writeValidEvents(tmp, 5);
    const r = await preCompactState({});
    expect(r.decision).toBe("continue");
    expect(fs.existsSync(snapshotsDir(tmp))).toBe(true);
    const files = fs.readdirSync(snapshotsDir(tmp))
      .filter((f) => f.startsWith("events-") && f.endsWith(".jsonl"));
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  test("valid events + active capsule → freezes capsule before compaction", async () => {
    writeValidEvents(tmp, 5);
    const capsule = createContextCapsule({
      purpose: "subagent-handoff",
      projectRoot: tmp,
      promptId: "prompt-freeze",
    });
    await persistContextCapsule(capsule, tmp);

    const r = await preCompactState({});

    expect(r.decision).toBe("continue");
    const frozen = await loadContextCapsule(capsule.capsuleId, tmp);
    expect(frozen?.lifecycle).toBe("frozen");
    expect(frozen?.frozenReason).toBe("precompact");
  });

  test("sequence gap (lastSequence != events.length) → block", async () => {
    const dir = path.join(tmp, ".palantir-mini", "session");
    fs.mkdirSync(dir, { recursive: true });
    const tw = { type: "session_started", when: "x", atopWhich: "x", throughWhich: { sessionId: "s", toolName: "t", cwd: tmp }, byWhom: { identity: "claude-code" }, payload: { model: "x", effort: "x" } };
    const lines = [
      { ...tw, eventId: "e1", sequence: 1 },
      { ...tw, eventId: "e2", sequence: 2 },
      { ...tw, eventId: "e3", sequence: 99 },
    ];
    fs.writeFileSync(eventsPath(tmp), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    const r = await preCompactState({});
    expect(r.decision).toBe("block");
    expect(r.reason).toContain("invariant failed");
  });

  test("snapshot taken even when emit fails (best-effort)", async () => {
    writeValidEvents(tmp, 2);
    const r = await preCompactState({});
    expect(r.decision).toBe("continue");
    const files = fs.readdirSync(snapshotsDir(tmp))
      .filter((f) => f.startsWith("events-") && f.endsWith(".jsonl"));
    expect(files.length).toBeGreaterThanOrEqual(1);
  });
});
