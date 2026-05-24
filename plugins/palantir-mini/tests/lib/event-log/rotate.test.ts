// palantir-mini v3.2.0 — events-log rotation tests (G3)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { rotateEventLog } from "../../../lib/event-log/rotate";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-rot-${label}-`));
}

function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function archiveDir(root: string): string {
  return path.join(root, ".palantir-mini", "session", "archive");
}

function writeEvents(root: string, lineCount: number, byteFiller = ""): void {
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const lines: string[] = [];
  for (let i = 1; i <= lineCount; i++) {
    lines.push(JSON.stringify({ type: "x", sequence: i, filler: byteFiller }));
  }
  fs.writeFileSync(eventsPath(root), lines.join("\n") + "\n");
}

describe("rotateEventLog (G3)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("g3"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("missing events.jsonl → no-op rotation", async () => {
    const r = await rotateEventLog(tmp);
    expect(r.rotated).toBe(false);
    expect(r.sizeBytes).toBe(0);
    expect(r.lineCount).toBe(0);
    expect(fs.existsSync(archiveDir(tmp))).toBe(false);
  });

  test("under both thresholds → no-op", async () => {
    writeEvents(tmp, 5);
    const r = await rotateEventLog(tmp, { thresholdBytes: 1_000_000, thresholdLines: 1_000 });
    expect(r.rotated).toBe(false);
    expect(r.lineCount).toBe(5);
  });

  test("over byte threshold → rotates", async () => {
    writeEvents(tmp, 3, "X".repeat(100));
    const r = await rotateEventLog(tmp, { thresholdBytes: 100, thresholdLines: 100_000 });
    expect(r.rotated).toBe(true);
    expect(r.archivedPath).toBeTruthy();
    expect(fs.existsSync(r.archivedPath!)).toBe(true);
    expect(fs.existsSync(eventsPath(tmp))).toBe(false);
  });

  test("over line threshold → rotates", async () => {
    writeEvents(tmp, 50);
    const r = await rotateEventLog(tmp, { thresholdBytes: 100_000_000, thresholdLines: 10 });
    expect(r.rotated).toBe(true);
    expect(r.archivedPath).toBeTruthy();
  });

  test("archived filename pattern is events-rotated-<ISO>.jsonl", async () => {
    writeEvents(tmp, 50);
    const r = await rotateEventLog(tmp, { thresholdBytes: 100_000_000, thresholdLines: 10 });
    expect(r.rotated).toBe(true);
    const base = path.basename(r.archivedPath!);
    expect(base).toMatch(/^events-rotated-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.jsonl$/);
  });

  test("archive content matches source byte-for-byte", async () => {
    writeEvents(tmp, 30);
    const original = fs.readFileSync(eventsPath(tmp), "utf8");
    const r = await rotateEventLog(tmp, { thresholdBytes: 100_000_000, thresholdLines: 10 });
    expect(r.rotated).toBe(true);
    const archived = fs.readFileSync(r.archivedPath!, "utf8");
    expect(archived).toBe(original);
  });

  test("rotation is atomic — no torn live file after", async () => {
    writeEvents(tmp, 50);
    await rotateEventLog(tmp, { thresholdBytes: 100_000_000, thresholdLines: 10 });
    // Live events.jsonl no longer exists; next emit will create fresh.
    expect(fs.existsSync(eventsPath(tmp))).toBe(false);
    // Archive dir holds the breach.
    expect(fs.existsSync(archiveDir(tmp))).toBe(true);
  });

  test("default thresholds: 10 MB OR 10K lines", async () => {
    writeEvents(tmp, 5);
    const r = await rotateEventLog(tmp);  // no opts → defaults
    expect(r.thresholdBytes).toBe(10 * 1024 * 1024);
    expect(r.thresholdLines).toBe(10_000);
    expect(r.rotated).toBe(false);
  });

  test("multiple rotations produce distinct archive files", async () => {
    writeEvents(tmp, 50);
    const r1 = await rotateEventLog(tmp, { thresholdBytes: 1, thresholdLines: 10 });
    expect(r1.rotated).toBe(true);
    // Wait 1ms to ensure ISO timestamp differs
    await new Promise((res) => setTimeout(res, 5));
    writeEvents(tmp, 50);
    const r2 = await rotateEventLog(tmp, { thresholdBytes: 1, thresholdLines: 10 });
    expect(r2.rotated).toBe(true);
    expect(r1.archivedPath).not.toBe(r2.archivedPath);
    expect(fs.existsSync(r1.archivedPath!)).toBe(true);
    expect(fs.existsSync(r2.archivedPath!)).toBe(true);
  });
});
