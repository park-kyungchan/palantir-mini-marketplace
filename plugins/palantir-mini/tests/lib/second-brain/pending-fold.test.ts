// palantir-mini — pending-fold bookmark tests (W3 single-manifest-authority, LEARN lane)
//
// W3 REWRITE: manifest.json.foldedSessions is the SOLE persisted fold-state store.
// markPending() writes status:"pending" directly into it (no separate pending-fold.json
// write path anymore); listPending() filters status:"pending" entries; migration tests
// cover migrateLegacyPendingFile()'s idempotency + precedence rule.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  pendingFoldPath,
  migratedPendingFoldPath,
  markPending,
  clearPending,
  listPending,
  markerIsGovernedComplete,
  migrateLegacyPendingFile,
  type PendingFoldEntry,
} from "../../../lib/second-brain/pending-fold";
import { manifestPath } from "../../../lib/second-brain/foldedsessions-bump-cli";

const tmpDirs: string[] = [];

function makeTmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pf-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, "second-brain"), { recursive: true });
  return dir;
}

function entry(sessionId: string): PendingFoldEntry {
  return {
    sessionId,
    transcriptPath: `/tmp/${sessionId}.jsonl`,
    bookmarkedAt: new Date().toISOString(),
    runtime: "claude-code",
  };
}

/** Read one foldedSessions[sessionId] record straight off disk. */
function readRec(root: string, sessionId: string): Record<string, unknown> | undefined {
  const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8")) as {
    foldedSessions?: Record<string, unknown>;
  };
  return m.foldedSessions?.[sessionId] as Record<string, unknown> | undefined;
}

/** Write a manifest with arbitrary per-session foldedSessions records (lifecycle or legacy). */
function writeManifestRecords(root: string, records: Record<string, unknown>): void {
  fs.writeFileSync(manifestPath(root), JSON.stringify({ foldedSessions: records }, null, 2), "utf8");
}

function lifecycleMarker(status: "in-progress" | "governed-complete", overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status,
    graphBatchesPersisted: 3,
    governedBatches: status === "governed-complete" ? 3 : 1,
    totalBatches: 3,
    nodeCount: 9,
    edgeCount: 0,
    startedAt: "2026-06-23T00:00:00.000Z",
    ...(status === "governed-complete" ? { foldedAt: "2026-06-23T01:00:00.000Z" } : {}),
    ...overrides,
  };
}

/** Write a LEGACY pending-fold.json file with the given entries (pre-W3 shape). */
function writeLegacyFile(root: string, entries: PendingFoldEntry[]): void {
  const pending: Record<string, PendingFoldEntry> = {};
  for (const e of entries) pending[e.sessionId] = e;
  fs.writeFileSync(pendingFoldPath(root), JSON.stringify({ pending }, null, 2) + "\n", "utf8");
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("pending-fold (W3) — markPending writes status:\"pending\" into the manifest", () => {
  test("markPending creates manifest.json.foldedSessions[sessionId] with status:\"pending\"", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    const rec = readRec(root, "sess-a");
    expect(rec?.status).toBe("pending");
    expect(rec?.sessionId).toBe("sess-a");
    expect(rec?.transcriptPath).toBe("/tmp/sess-a.jsonl");
    expect(typeof rec?.bookmarkedAt).toBe("string");
    expect(rec?.runtime).toBe("claude-code");
  });

  test("second markPending of same sessionId is idempotent (one key, refreshed fields)", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    markPending(root, { ...entry("sess-a"), transcriptPath: "/tmp/sess-a-v2.jsonl" });
    const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect(Object.keys(m.foldedSessions).length).toBe(1);
    expect(readRec(root, "sess-a")?.transcriptPath).toBe("/tmp/sess-a-v2.jsonl");
  });

  test("markPending does NOT clobber an existing in-progress record (precedence)", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, { "sess-a": lifecycleMarker("in-progress") });
    markPending(root, entry("sess-a"));
    expect(readRec(root, "sess-a")?.status).toBe("in-progress");
  });

  test("markPending does NOT clobber an existing governed-complete record (precedence)", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, { "sess-a": lifecycleMarker("governed-complete") });
    markPending(root, entry("sess-a"));
    expect(readRec(root, "sess-a")?.status).toBe("governed-complete");
  });

  test("markPending does NOT clobber an OLD write-once legacy record (no status field)", () => {
    const root = makeTmpRoot();
    const legacy = { foldedAt: "2026-06-01", nodeCount: 68, edgeCount: 60 };
    writeManifestRecords(root, { "sess-a": legacy });
    markPending(root, entry("sess-a"));
    expect(readRec(root, "sess-a")).toEqual(legacy);
  });

  test("markPending preserves every other manifest key + sibling record (no clobber)", () => {
    const root = makeTmpRoot();
    fs.writeFileSync(
      manifestPath(root),
      JSON.stringify({ foldedSessions: { other: lifecycleMarker("in-progress") }, envelopeRev: 7 }, null, 2) + "\n",
      "utf8",
    );
    markPending(root, entry("sess-a"));
    const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect(m.envelopeRev).toBe(7);
    expect(m.foldedSessions.other).toEqual(lifecycleMarker("in-progress"));
  });

  test("markPending is atomic — no .tmp left behind", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    expect(fs.existsSync(`${manifestPath(root)}.tmp`)).toBe(false);
  });
});

describe("pending-fold (W3) — clearPending", () => {
  test("clearPending removes a status:\"pending\" record", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    markPending(root, entry("sess-b"));
    clearPending(root, "sess-a");
    expect(readRec(root, "sess-a")).toBeUndefined();
    expect(readRec(root, "sess-b")?.status).toBe("pending");
  });

  test("clearPending on an absent sessionId is a no-op", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    clearPending(root, "does-not-exist");
    expect(readRec(root, "sess-a")?.status).toBe("pending");
  });

  test("clearPending NEVER touches an in-progress or governed-complete record", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, {
      ip: lifecycleMarker("in-progress"),
      gc: lifecycleMarker("governed-complete"),
    });
    clearPending(root, "ip");
    clearPending(root, "gc");
    expect(readRec(root, "ip")?.status).toBe("in-progress");
    expect(readRec(root, "gc")?.status).toBe("governed-complete");
  });
});

describe("pending-fold (W3) — listPending filters purely on status===\"pending\"", () => {
  test("only status:\"pending\" entries are listed", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, {
      p1: { status: "pending", sessionId: "p1", transcriptPath: "/t/p1.jsonl", bookmarkedAt: "x", runtime: "claude-code" },
      ip: lifecycleMarker("in-progress"),
      gc: lifecycleMarker("governed-complete"),
    });
    const ids = listPending(root).map((e) => e.sessionId);
    expect(ids).toEqual(["p1"]);
  });

  test("an OLD write-once legacy record (no status) is excluded from pending", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, { legacy: { foldedAt: "2026-06-01", nodeCount: 68, edgeCount: 60 } });
    expect(listPending(root).length).toBe(0);
  });

  test("no manifest at all → empty pending list (no throw)", () => {
    const root = makeTmpRoot();
    expect(listPending(root)).toEqual([]);
  });

  test("mixed manifest: only the pending record surfaces", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, {
      gc: lifecycleMarker("governed-complete"),
      legacy: { foldedAt: "x", nodeCount: 1, edgeCount: 0 },
      ip: lifecycleMarker("in-progress"),
      p1: { status: "pending", sessionId: "p1", transcriptPath: "/t/p1.jsonl", bookmarkedAt: "x", runtime: "claude-code" },
    });
    expect(listPending(root).map((e) => e.sessionId)).toEqual(["p1"]);
  });
});

describe("pending-fold (W3) — markerIsGovernedComplete (explicit status-literal match only)", () => {
  test("status===\"governed-complete\" → true", () => {
    expect(markerIsGovernedComplete(lifecycleMarker("governed-complete"))).toBe(true);
  });

  test("status===\"in-progress\" → false", () => {
    expect(markerIsGovernedComplete(lifecycleMarker("in-progress"))).toBe(false);
  });

  test("status===\"pending\" → false", () => {
    expect(
      markerIsGovernedComplete({ status: "pending", sessionId: "x", transcriptPath: "t", bookmarkedAt: "b", runtime: "r" }),
    ).toBe(false);
  });

  test("an OLD write-once legacy record (no status) → false (legacy no-status special-casing REMOVED under W3)", () => {
    expect(markerIsGovernedComplete({ foldedAt: "x", nodeCount: 5, edgeCount: 3 })).toBe(false);
  });

  test("absent / non-object → false", () => {
    expect(markerIsGovernedComplete(undefined)).toBe(false);
    expect(markerIsGovernedComplete(null)).toBe(false);
    expect(markerIsGovernedComplete("nope")).toBe(false);
  });
});

describe("pending-fold (W3) — migrateLegacyPendingFile", () => {
  test("no legacy file → no-op (does not throw, no manifest created)", () => {
    const root = makeTmpRoot();
    migrateLegacyPendingFile(root);
    expect(fs.existsSync(manifestPath(root))).toBe(false);
  });

  test("folds legacy entries into the manifest as status:\"pending\" and renames the file", () => {
    const root = makeTmpRoot();
    writeLegacyFile(root, [entry("legacy-a"), entry("legacy-b")]);
    migrateLegacyPendingFile(root);

    expect(readRec(root, "legacy-a")?.status).toBe("pending");
    expect(readRec(root, "legacy-b")?.status).toBe("pending");
    expect(fs.existsSync(pendingFoldPath(root))).toBe(false);
    expect(fs.existsSync(migratedPendingFoldPath(root))).toBe(true);
  });

  test("idempotent: calling it TWICE is a no-op the second time (no throw, no duplicate mutation)", () => {
    const root = makeTmpRoot();
    writeLegacyFile(root, [entry("legacy-a")]);
    migrateLegacyPendingFile(root);
    const afterFirst = fs.readFileSync(manifestPath(root), "utf8");

    migrateLegacyPendingFile(root); // second call — legacy file already renamed away

    const afterSecond = fs.readFileSync(manifestPath(root), "utf8");
    expect(afterSecond).toBe(afterFirst); // byte-stable — no-op
    expect(fs.existsSync(pendingFoldPath(root))).toBe(false);
  });

  test("PRECEDENCE: does NOT clobber an existing in-progress record with a legacy pending entry", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, { "sess-a": lifecycleMarker("in-progress") });
    writeLegacyFile(root, [entry("sess-a")]);
    migrateLegacyPendingFile(root);
    expect(readRec(root, "sess-a")?.status).toBe("in-progress");
  });

  test("PRECEDENCE: does NOT clobber an existing governed-complete record with a legacy pending entry", () => {
    const root = makeTmpRoot();
    writeManifestRecords(root, { "sess-a": lifecycleMarker("governed-complete") });
    writeLegacyFile(root, [entry("sess-a")]);
    migrateLegacyPendingFile(root);
    expect(readRec(root, "sess-a")?.status).toBe("governed-complete");
  });

  test("PRECEDENCE: does NOT clobber an OLD write-once legacy manifest record", () => {
    const root = makeTmpRoot();
    const oldMarker = { foldedAt: "2026-06-01", nodeCount: 68, edgeCount: 60 };
    writeManifestRecords(root, { "sess-a": oldMarker });
    writeLegacyFile(root, [entry("sess-a")]);
    migrateLegacyPendingFile(root);
    expect(readRec(root, "sess-a")).toEqual(oldMarker);
  });

  test("seeds a fresh status:\"pending\" entry when no manifest record exists yet", () => {
    const root = makeTmpRoot();
    writeLegacyFile(root, [entry("brand-new")]);
    migrateLegacyPendingFile(root);
    expect(readRec(root, "brand-new")?.status).toBe("pending");
  });

  test("listPending() triggers migration itself (whichever read path runs first)", () => {
    const root = makeTmpRoot();
    writeLegacyFile(root, [entry("legacy-a")]);
    const ids = listPending(root).map((e) => e.sessionId);
    expect(ids).toContain("legacy-a");
    expect(fs.existsSync(pendingFoldPath(root))).toBe(false);
    expect(fs.existsSync(migratedPendingFoldPath(root))).toBe(true);
  });

  test("an empty legacy file (no entries) still gets renamed away (idempotent no-entries case)", () => {
    const root = makeTmpRoot();
    writeLegacyFile(root, []);
    migrateLegacyPendingFile(root);
    expect(fs.existsSync(pendingFoldPath(root))).toBe(false);
    expect(fs.existsSync(migratedPendingFoldPath(root))).toBe(true);
  });
});
