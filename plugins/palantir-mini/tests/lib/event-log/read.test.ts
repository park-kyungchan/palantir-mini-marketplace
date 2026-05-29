// palantir-mini v3.2.0 — readEvents archive merge tests (G3 reader)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readEvents } from "../../../lib/event-log/read";
import type { ReadEventsOptions } from "../../../lib/event-log/read";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-read-${label}-`));
}
function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}
function archiveDir(root: string): string {
  return path.join(root, ".palantir-mini", "session", "archive");
}
function writeJsonlLines(filePath: string, sequences: number[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = sequences.map((seq) =>
    JSON.stringify({ type: "session_started", sequence: seq, eventId: `e-${seq}`, when: "x", atopWhich: "x", throughWhich: { sessionId: "s", toolName: "t", cwd: "x" }, byWhom: { identity: "claude-code" }, payload: { model: "x", effort: "x" } })
  );
  fs.writeFileSync(filePath, lines.join("\n") + "\n");
}

describe("readEvents (G3 archive merge)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("rd"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("no live + no archive -> empty array", () => {
    expect(readEvents(eventsPath(tmp))).toEqual([]);
  });
  test("live only (legacy path) -> returns live events", () => {
    writeJsonlLines(eventsPath(tmp), [1, 2, 3]);
    const events = readEvents(eventsPath(tmp));
    expect(events.length).toBe(3);
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3]);
  });
  test("archive only (live missing post-rotation) -> returns archive events", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2, 3]);
    const events = readEvents(eventsPath(tmp));
    expect(events.length).toBe(3);
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3]);
  });
  test("archive + live -> merged + sorted by sequence", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2, 3]);
    writeJsonlLines(eventsPath(tmp), [4, 5, 6]);
    const events = readEvents(eventsPath(tmp));
    expect(events.length).toBe(6);
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  test("multiple archive files merged + sorted across boundaries", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2]);
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-30-00-000Z.jsonl"), [3, 4]);
    writeJsonlLines(eventsPath(tmp), [5, 6]);
    const events = readEvents(eventsPath(tmp));
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  test("malformed lines in archive are skipped (best-effort)", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    const arch = path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl");
    fs.writeFileSync(arch, [
      JSON.stringify({ type: "session_started", sequence: 1, eventId: "x", when: "x", atopWhich: "x", throughWhich: { sessionId: "s", toolName: "t", cwd: "x" }, byWhom: { identity: "claude-code" }, payload: { model: "x", effort: "x" } }),
      "{ corrupted-json",
      JSON.stringify({ type: "session_started", sequence: 2, eventId: "y", when: "x", atopWhich: "x", throughWhich: { sessionId: "s", toolName: "t", cwd: "x" }, byWhom: { identity: "claude-code" }, payload: { model: "x", effort: "x" } }),
    ].join("\n") + "\n");
    const events = readEvents(eventsPath(tmp));
    expect(events.map((e) => e.sequence)).toEqual([1, 2]);
  });
  test("non-rotation files in archive dir ignored", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1]);
    fs.writeFileSync(path.join(archiveDir(tmp), "README.md"), "ignored");
    fs.writeFileSync(path.join(archiveDir(tmp), "stuff.jsonl"), '{"sequence":99}\n');
    const events = readEvents(eventsPath(tmp));
    expect(events.map((e) => e.sequence)).toEqual([1]);
  });
});

describe("readEvents options (v6.43.0 -- includeArchive + since + archiveCount)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("opts"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("live-only mode ignores archives", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2]);
    writeJsonlLines(eventsPath(tmp), [3, 4]);
    const result = readEvents(eventsPath(tmp), { includeArchive: "live-only" });
    expect(result.events.map((e) => e.sequence)).toEqual([3, 4]);
    expect(result.archiveCount).toBe(0);
  });
  test("live-only mode with empty archive dir returns only live", () => {
    writeJsonlLines(eventsPath(tmp), [1, 2, 3]);
    const result = readEvents(eventsPath(tmp), { includeArchive: "live-only" });
    expect(result.events.map((e) => e.sequence)).toEqual([1, 2, 3]);
    expect(result.archiveCount).toBe(0);
  });
  test("archive-only mode ignores live file", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2]);
    writeJsonlLines(eventsPath(tmp), [3, 4]);
    const result = readEvents(eventsPath(tmp), { includeArchive: "archive-only" });
    expect(result.events.map((e) => e.sequence)).toEqual([1, 2]);
    expect(result.archiveCount).toBe(1);
  });
  test("archive-only mode with no archive dir returns empty + archiveCount 0", () => {
    writeJsonlLines(eventsPath(tmp), [1, 2, 3]);
    const result = readEvents(eventsPath(tmp), { includeArchive: "archive-only" });
    expect(result.events).toEqual([]);
    expect(result.archiveCount).toBe(0);
  });
  test("all mode (explicit) merges live + archives", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2]);
    writeJsonlLines(eventsPath(tmp), [3, 4]);
    const result = readEvents(eventsPath(tmp), { includeArchive: "all" });
    expect(result.events.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
    expect(result.archiveCount).toBe(1);
  });
  test("default mode (no includeArchive key) merges all -- backward-compatible", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2]);
    writeJsonlLines(eventsPath(tmp), [3, 4]);
    const result = readEvents(eventsPath(tmp), {} as ReadEventsOptions);
    expect(result.events.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
    expect(result.archiveCount).toBe(1);
  });
  test("since filter returns only events with sequence >= since", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2, 3]);
    writeJsonlLines(eventsPath(tmp), [4, 5, 6]);
    const result = readEvents(eventsPath(tmp), { since: 3 });
    expect(result.events.map((e) => e.sequence)).toEqual([3, 4, 5, 6]);
  });
  test("since + live-only filters only within live", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1, 2]);
    writeJsonlLines(eventsPath(tmp), [3, 4, 5]);
    const result = readEvents(eventsPath(tmp), { includeArchive: "live-only", since: 4 });
    expect(result.events.map((e) => e.sequence)).toEqual([4, 5]);
    expect(result.archiveCount).toBe(0);
  });
  test("since > all sequences returns empty events array", () => {
    writeJsonlLines(eventsPath(tmp), [1, 2, 3]);
    const result = readEvents(eventsPath(tmp), { since: 999 });
    expect(result.events).toEqual([]);
  });
  test("no live + no archive + options returns empty result", () => {
    const result = readEvents(eventsPath(tmp), { includeArchive: "all" });
    expect(result.events).toEqual([]);
    expect(result.archiveCount).toBe(0);
  });
  test("archiveCount reflects number of rotation files discovered", () => {
    fs.mkdirSync(archiveDir(tmp), { recursive: true });
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T12-00-00-000Z.jsonl"), [1]);
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T13-00-00-000Z.jsonl"), [2]);
    writeJsonlLines(path.join(archiveDir(tmp), "events-rotated-2026-04-25T14-00-00-000Z.jsonl"), [3]);
    writeJsonlLines(eventsPath(tmp), [4]);
    const result = readEvents(eventsPath(tmp), {});
    expect(result.archiveCount).toBe(3);
    expect(result.events.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
  });

  test("legacy runtime-gap events missing withWhat are reconciled in memory only", () => {
    const filePath = eventsPath(tmp);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const legacy = {
      type: "dtc_grader_runtime_gap",
      sequence: 1,
      eventId: "evt-runtime-gap-legacy",
      when: "2026-05-29T00:00:00.000Z",
      atopWhich: "abc123",
      throughWhich: { sessionId: "s", toolName: "pm_semantic_intent_gate", cwd: tmp },
      byWhom: { identity: "codex", runtime: "codex" },
      payload: { runtime: "codex", reason: "model grader runtime gap" },
    };
    fs.writeFileSync(filePath, `${JSON.stringify(legacy)}\n`);

    const result = readEvents(filePath, {});
    expect(result.events).toHaveLength(1);
    const event = result.events[0]!;
    expect(event.withWhat?.reasoning).toContain("reconciled legacy runtime-gap event");
    expect(event.withWhat?.memoryLayers).toEqual(["procedural"]);
    expect(event.withWhat?.refinementTarget?.kind).toBe("rule-conformance-policy");
    expect(fs.readFileSync(filePath, "utf8")).not.toContain("withWhat");
  });
});
