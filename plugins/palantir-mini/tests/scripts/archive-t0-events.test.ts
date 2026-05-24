// palantir-mini v4.11.0 — archive-t0-events script tests (rule 26 §Substrate routing)
// Verifies: (1) archives T0 older than 7d, (2) preserves T0 newer than 7d,
//           (3) idempotent re-run, (4) non-T0 events always kept.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  archiveT0Events,
  eventsJsonlPath,
  archiveDir,
  t0ArchiveFilePath,
  isOlderThan,
  readArchivedEventIds,
} from "../../scripts/archive-t0-events";

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-archive-t0-"));
  // Create session directory structure
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helper: build a minimal EventEnvelope line ────────────────────────────

function makeEventLine(opts: {
  eventId: string;
  when:    string;
  valueGrade?: string;
  type?: string;
}): string {
  return JSON.stringify({
    eventId:    opts.eventId,
    sequence:   1,
    when:       opts.when,
    atopWhich:  "abc123",
    throughWhich: { sessionId: "sess-test", toolName: "Bash", cwd: TMP },
    byWhom:     { identity: "claude-code" },
    type:       opts.type ?? "phase_completed",
    payload:    {},
    valueGrade: opts.valueGrade ?? "T1",
  });
}

function writeEvents(lines: string[]): void {
  const eventsPath = eventsJsonlPath(TMP);
  fs.writeFileSync(eventsPath, lines.join("\n") + "\n", "utf8");
}

const NOW = new Date("2026-05-08T12:00:00.000Z");
// 8 days ago — older than 7d cutoff
const OLD = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
// 3 days ago — newer than 7d cutoff
const RECENT = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

// ─── Unit: isOlderThan ──────────────────────────────────────────────────────

describe("isOlderThan", () => {
  test("returns true for event older than ageDays", () => {
    expect(isOlderThan(OLD, 7, NOW)).toBe(true);
  });

  test("returns false for event newer than ageDays", () => {
    expect(isOlderThan(RECENT, 7, NOW)).toBe(false);
  });

  test("returns false for invalid date string", () => {
    expect(isOlderThan("not-a-date", 7, NOW)).toBe(false);
  });
});

// ─── Integration: archiveT0Events ──────────────────────────────────────────

describe("archiveT0Events", () => {
  // Case 1: archives T0 events older than 7 days
  test("archives T0 events older than 7d and removes them from canonical events.jsonl", async () => {
    const oldT0 = makeEventLine({ eventId: "evt-old-t0", when: OLD, valueGrade: "T0" });
    const kept  = makeEventLine({ eventId: "evt-kept-t1", when: OLD, valueGrade: "T1" });
    writeEvents([oldT0, kept]);

    const result = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });

    expect(result.archivedCount).toBe(1);
    expect(result.keptCount).toBe(1);
    expect(result.skippedDuplicate).toBe(0);
    expect(result.dryRun).toBe(false);

    // Archive file must exist and contain the T0 event
    const archivePath = t0ArchiveFilePath(TMP, NOW);
    expect(fs.existsSync(archivePath)).toBe(true);
    const archiveContent = fs.readFileSync(archivePath, "utf8");
    expect(archiveContent).toContain("evt-old-t0");
    expect(archiveContent).not.toContain("evt-kept-t1");

    // Canonical events.jsonl must no longer contain the archived T0
    const canonicalContent = fs.readFileSync(eventsJsonlPath(TMP), "utf8");
    expect(canonicalContent).not.toContain("evt-old-t0");
    expect(canonicalContent).toContain("evt-kept-t1");
  });

  // Case 2: preserves T0 events newer than 7 days
  test("preserves T0 events newer than 7d in canonical events.jsonl", async () => {
    const recentT0 = makeEventLine({ eventId: "evt-recent-t0", when: RECENT, valueGrade: "T0" });
    const oldT1    = makeEventLine({ eventId: "evt-old-t1", when: OLD, valueGrade: "T1" });
    writeEvents([recentT0, oldT1]);

    const result = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });

    // No T0 events are old enough to archive
    expect(result.archivedCount).toBe(0);
    expect(result.keptCount).toBe(2);

    // Canonical file must still contain the recent T0
    const canonicalContent = fs.readFileSync(eventsJsonlPath(TMP), "utf8");
    expect(canonicalContent).toContain("evt-recent-t0");
    expect(canonicalContent).toContain("evt-old-t1");

    // Archive file should NOT be created when nothing was archived
    const archivePath = t0ArchiveFilePath(TMP, NOW);
    expect(fs.existsSync(archivePath)).toBe(false);
  });

  // Case 3: idempotent re-run
  test("re-running on already-archived events is a no-op (idempotent)", async () => {
    const oldT0 = makeEventLine({ eventId: "evt-dup-t0", when: OLD, valueGrade: "T0" });
    writeEvents([oldT0]);

    // First run: archives the T0 event
    const result1 = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });
    expect(result1.archivedCount).toBe(1);

    // After first run, canonical events.jsonl no longer has the T0 event.
    // Simulate the T0 event somehow appearing back in canonical (edge case: manual restore)
    // by re-writing it back to events.jsonl
    const archivePath = t0ArchiveFilePath(TMP, NOW);
    writeEvents([oldT0]);

    // Second run: event is already in archive, should not re-archive
    const result2 = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });
    expect(result2.archivedCount).toBe(0);
    expect(result2.skippedDuplicate).toBe(1);

    // Archive file must still only have the event once
    const archiveContent = fs.readFileSync(archivePath, "utf8");
    const archiveLines = archiveContent.split("\n").filter((l) => l.trim().length > 0);
    const occurrences = archiveLines.filter((l) => l.includes("evt-dup-t0"));
    expect(occurrences.length).toBe(1);
  });

  // Case 4: dry-run does not modify any files
  test("dry-run mode makes no changes to files", async () => {
    const oldT0 = makeEventLine({ eventId: "evt-dry-t0", when: OLD, valueGrade: "T0" });
    writeEvents([oldT0]);
    const originalContent = fs.readFileSync(eventsJsonlPath(TMP), "utf8");

    const result = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.archivedCount).toBe(1);

    // Canonical must be unchanged
    const afterContent = fs.readFileSync(eventsJsonlPath(TMP), "utf8");
    expect(afterContent).toBe(originalContent);

    // Archive file must NOT be created
    const archivePath = t0ArchiveFilePath(TMP, NOW);
    expect(fs.existsSync(archivePath)).toBe(false);
  });

  // Case 5: empty events.jsonl — graceful no-op
  test("returns zero counts when events.jsonl is empty", async () => {
    fs.writeFileSync(eventsJsonlPath(TMP), "", "utf8");

    const result = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });

    expect(result.archivedCount).toBe(0);
    expect(result.keptCount).toBe(0);
    expect(result.skippedDuplicate).toBe(0);
  });

  // Case 6: missing events.jsonl — returns zero counts without throwing
  test("returns zero counts when events.jsonl does not exist", async () => {
    // Do not write events file
    const result = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });
    expect(result.archivedCount).toBe(0);
    expect(result.keptCount).toBe(0);
  });

  // Case 7: non-T0 events (T1, T2, T3, T4) are never archived regardless of age
  test("never archives non-T0 events regardless of age", async () => {
    const lines = ["T1", "T2", "T3", "T4"].map((grade, i) =>
      makeEventLine({ eventId: `evt-grade-${grade}`, when: OLD, valueGrade: grade, type: "phase_completed" })
    );
    writeEvents(lines);

    const result = await archiveT0Events({ projectRoot: TMP, ageDays: 7, now: NOW });

    expect(result.archivedCount).toBe(0);
    expect(result.keptCount).toBe(4);

    const archivePath = t0ArchiveFilePath(TMP, NOW);
    expect(fs.existsSync(archivePath)).toBe(false);
  });
});

// ─── Unit: path helpers ──────────────────────────────────────────────────────

describe("path helpers", () => {
  test("eventsJsonlPath returns expected path", () => {
    expect(eventsJsonlPath("/proj")).toBe("/proj/.palantir-mini/session/events.jsonl");
  });

  test("archiveDir returns expected path", () => {
    expect(archiveDir("/proj")).toBe("/proj/.palantir-mini/session/archive");
  });

  test("t0ArchiveFilePath returns date-stamped path", () => {
    const d = new Date("2026-05-08T00:00:00.000Z");
    expect(t0ArchiveFilePath("/proj", d)).toBe("/proj/.palantir-mini/session/archive/T0-2026-05-08.jsonl");
  });
});

// ─── Unit: readArchivedEventIds ──────────────────────────────────────────────

describe("readArchivedEventIds", () => {
  test("returns empty set when file does not exist", () => {
    const ids = readArchivedEventIds("/nonexistent/path.jsonl");
    expect(ids.size).toBe(0);
  });

  test("returns set of eventIds from archive file", () => {
    const archivePath = path.join(TMP, "archive.jsonl");
    fs.writeFileSync(archivePath, JSON.stringify({ eventId: "evt-a" }) + "\n" + JSON.stringify({ eventId: "evt-b" }) + "\n", "utf8");
    const ids = readArchivedEventIds(archivePath);
    expect(ids.has("evt-a")).toBe(true);
    expect(ids.has("evt-b")).toBe(true);
    expect(ids.size).toBe(2);
  });

  test("skips malformed lines gracefully", () => {
    const archivePath = path.join(TMP, "archive.jsonl");
    fs.writeFileSync(archivePath, "not-json\n" + JSON.stringify({ eventId: "evt-c" }) + "\n", "utf8");
    const ids = readArchivedEventIds(archivePath);
    expect(ids.has("evt-c")).toBe(true);
    expect(ids.size).toBe(1);
  });
});
