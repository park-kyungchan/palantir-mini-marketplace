// palantir-mini — foldedsessions-retention-cli tests (W3 workstream D, LEARN lane).
// Thin I/O shell over the pure planRetention(): plan (dry-run, no mutation) vs compact
// (archive-append THEN live-manifest removal, under the manifest lock, never a silent
// delete).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  compactFoldedSessions,
  planFoldedSessionsRetention,
  manifestArchivePath,
} from "../../../lib/second-brain/foldedsessions-retention-cli";
import { manifestPath } from "../../../lib/second-brain/foldedsessions-bump-cli";

const tmpDirs: string[] = [];

function makeTmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-retention-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, "second-brain"), { recursive: true });
  return dir;
}

function gcMarker(foldedAt: string): Record<string, unknown> {
  return {
    status: "governed-complete",
    graphBatchesPersisted: 1,
    governedBatches: 1,
    totalBatches: 1,
    nodeCount: 1,
    edgeCount: 0,
    startedAt: foldedAt,
    foldedAt,
  };
}

function writeManifest(root: string, records: Record<string, unknown>): void {
  fs.writeFileSync(manifestPath(root), JSON.stringify({ foldedSessions: records }, null, 2) + "\n", "utf8");
}

function readArchiveRows(root: string): Record<string, unknown>[] {
  if (!fs.existsSync(manifestArchivePath(root))) return [];
  return fs
    .readFileSync(manifestArchivePath(root), "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

const OLD_DATE = "2020-01-01T00:00:00.000Z";
const FRESH_POLICY = { liveDays: 999999, maxLiveEntries: 999999, reason: "no-op policy" };
const AGE_POLICY = { liveDays: 1, maxLiveEntries: 999999, reason: "age-compacts-everything-old" };

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("foldedsessions-retention-cli — plan (dry-run, no mutation)", () => {
  test("plan does not touch the manifest or create an archive", () => {
    const root = makeTmpRoot();
    writeManifest(root, { old: gcMarker(OLD_DATE) });
    const before = fs.readFileSync(manifestPath(root), "utf8");

    const plan = planFoldedSessionsRetention(root, AGE_POLICY);

    expect(plan.compactable.map((c) => c.sessionId)).toEqual(["old"]);
    expect(fs.readFileSync(manifestPath(root), "utf8")).toBe(before);
    expect(fs.existsSync(manifestArchivePath(root))).toBe(false);
  });
});

describe("foldedsessions-retention-cli — compact (archive-append THEN removal)", () => {
  test("a no-op compaction (nothing compactable) leaves the manifest untouched, changed:false", () => {
    const root = makeTmpRoot();
    writeManifest(root, { fresh: gcMarker(new Date().toISOString()) });
    const before = fs.readFileSync(manifestPath(root), "utf8");

    const result = compactFoldedSessions(root, FRESH_POLICY);

    expect(result.changed).toBe(false);
    expect(result.compactedCount).toBe(0);
    expect(fs.readFileSync(manifestPath(root), "utf8")).toBe(before);
    expect(fs.existsSync(manifestArchivePath(root))).toBe(false);
  });

  test("compacts an old marker: archived (append-only jsonl) AND removed from the live manifest", () => {
    const root = makeTmpRoot();
    writeManifest(root, { old: gcMarker(OLD_DATE), fresh: gcMarker(new Date().toISOString()) });

    const result = compactFoldedSessions(root, AGE_POLICY);

    expect(result.changed).toBe(true);
    expect(result.compactedCount).toBe(1);
    expect(result.retainedCount).toBe(1);

    // removed from the live manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect("old" in manifest.foldedSessions).toBe(false);
    expect("fresh" in manifest.foldedSessions).toBe(true);

    // archived — append-only, one JSON object per line
    const rows = readArchiveRows(root);
    expect(rows.length).toBe(1);
    expect(rows[0]?.sessionId).toBe("old");
    expect(rows[0]?.reason).toBe("age");
    expect(typeof rows[0]?.archivedAt).toBe("string");
    expect((rows[0]?.marker as Record<string, unknown>)?.foldedAt).toBe(OLD_DATE);
  });

  test("archive is APPEND-ONLY across multiple compaction runs (prior rows survive)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { old1: gcMarker(OLD_DATE) });
    compactFoldedSessions(root, AGE_POLICY);

    writeManifest(root, { old2: gcMarker(OLD_DATE) });
    compactFoldedSessions(root, AGE_POLICY);

    const rows = readArchiveRows(root);
    expect(rows.map((r) => r.sessionId).sort()).toEqual(["old1", "old2"]);
  });

  test("preserves every other manifest key + sibling non-compactable record", () => {
    const root = makeTmpRoot();
    fs.writeFileSync(
      manifestPath(root),
      JSON.stringify({ foldedSessions: { old: gcMarker(OLD_DATE) }, envelopeRev: 3 }, null, 2) + "\n",
      "utf8",
    );
    compactFoldedSessions(root, AGE_POLICY);
    const manifest = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect(manifest.envelopeRev).toBe(3);
  });

  test("never removes a \"pending\"/\"in-progress\"/legacy marker regardless of policy aggressiveness", () => {
    const root = makeTmpRoot();
    writeManifest(root, {
      p: { status: "pending", sessionId: "p", transcriptPath: "t", bookmarkedAt: "b", runtime: "r" },
      ip: { status: "in-progress", graphBatchesPersisted: 1, governedBatches: 0, totalBatches: 3, nodeCount: 1, edgeCount: 0, startedAt: OLD_DATE },
      legacy: { foldedAt: OLD_DATE, nodeCount: 1, edgeCount: 0 },
    });
    const result = compactFoldedSessions(root, AGE_POLICY);
    expect(result.changed).toBe(false);
    const manifest = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect(Object.keys(manifest.foldedSessions).sort()).toEqual(["ip", "legacy", "p"]);
  });

  test("no manifest at all → no-op, no throw", () => {
    const root = makeTmpRoot();
    const result = compactFoldedSessions(root, AGE_POLICY);
    expect(result.changed).toBe(false);
  });
});
