// palantir-mini — pending-fold bookmark tests (P1-2, LEARN lane)
// Deterministic marker the Stop hook writes (NO LLM) and the model-driven fold
// clears. listPending cross-checks the engine's manifest.foldedSessions so a
// folded session never re-triggers.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  pendingFoldPath,
  readPendingFold,
  writePendingFold,
  markPending,
  clearPending,
  listPending,
  markerIsGovernedComplete,
  type PendingFoldEntry,
} from "../../../lib/second-brain/pending-fold";

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

function writeManifest(root: string, folded: string[]): void {
  const foldedSessions: Record<string, unknown> = {};
  for (const s of folded) foldedSessions[s] = { foldedAt: "x", nodeCount: 0, edgeCount: 0 };
  fs.writeFileSync(
    path.join(root, "second-brain", "manifest.json"),
    JSON.stringify({ foldedSessions }, null, 2),
    "utf8",
  );
}

/** Write a manifest with arbitrary per-session foldedSessions records (lifecycle or legacy). */
function writeManifestRecords(root: string, records: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(root, "second-brain", "manifest.json"),
    JSON.stringify({ foldedSessions: records }, null, 2),
    "utf8",
  );
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

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("pending-fold — round-trip + idempotency", () => {
  test("markPending then readPendingFold round-trips the entry", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    const f = readPendingFold(pendingFoldPath(root));
    expect(f.pending["sess-a"]?.sessionId).toBe("sess-a");
    expect(f.pending["sess-a"]?.transcriptPath).toBe("/tmp/sess-a.jsonl");
  });

  test("second markPending of same sessionId is idempotent (one key)", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    markPending(root, entry("sess-a"));
    const f = readPendingFold(pendingFoldPath(root));
    expect(Object.keys(f.pending).length).toBe(1);
  });
});

describe("pending-fold — clearPending", () => {
  test("clearPending removes the key", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    markPending(root, entry("sess-b"));
    clearPending(root, "sess-a");
    const f = readPendingFold(pendingFoldPath(root));
    expect("sess-a" in f.pending).toBe(false);
    expect("sess-b" in f.pending).toBe(true);
  });

  test("clearing an absent sessionId is a no-op", () => {
    const root = makeTmpRoot();
    markPending(root, entry("sess-a"));
    clearPending(root, "does-not-exist");
    const f = readPendingFold(pendingFoldPath(root));
    expect(Object.keys(f.pending).length).toBe(1);
  });
});

describe("pending-fold — listPending excludes folded sessions", () => {
  test("a sessionId present in manifest.foldedSessions is excluded", () => {
    const root = makeTmpRoot();
    markPending(root, entry("folded-one"));
    markPending(root, entry("unfolded-one"));
    writeManifest(root, ["folded-one"]);

    const pend = listPending(root);
    const ids = pend.map((e) => e.sessionId);
    expect(ids).toContain("unfolded-one");
    expect(ids).not.toContain("folded-one");
    expect(pend.length).toBe(1);
  });

  test("no manifest → all pending entries are actionable", () => {
    const root = makeTmpRoot();
    markPending(root, entry("a"));
    markPending(root, entry("b"));
    expect(listPending(root).length).toBe(2);
  });
});

describe("pending-fold — G2-A lifecycle marker semantics", () => {
  test("markerIsGovernedComplete truth-table (the SOLE done definition)", () => {
    // OLD write-once (no status) → done (present == done, back-compat)
    expect(markerIsGovernedComplete({ foldedAt: "x", nodeCount: 5, edgeCount: 3 })).toBe(true);
    // lifecycle governed-complete → done
    expect(markerIsGovernedComplete(lifecycleMarker("governed-complete"))).toBe(true);
    // lifecycle in-progress → NOT done (resumes)
    expect(markerIsGovernedComplete(lifecycleMarker("in-progress"))).toBe(false);
    // absent / non-object → not done
    expect(markerIsGovernedComplete(undefined)).toBe(false);
    expect(markerIsGovernedComplete(null)).toBe(false);
    expect(markerIsGovernedComplete("nope")).toBe(false);
  });

  test("a governed-complete lifecycle record is excluded from pending", () => {
    const root = makeTmpRoot();
    markPending(root, entry("done-one"));
    writeManifestRecords(root, { "done-one": lifecycleMarker("governed-complete") });
    expect(listPending(root).map((e) => e.sessionId)).not.toContain("done-one");
    expect(listPending(root).length).toBe(0);
  });

  test("an IN-PROGRESS lifecycle record STAYS pending (re-triggers a resume)", () => {
    const root = makeTmpRoot();
    markPending(root, entry("partial-one"));
    writeManifestRecords(root, { "partial-one": lifecycleMarker("in-progress") });
    const ids = listPending(root).map((e) => e.sessionId);
    expect(ids).toContain("partial-one"); // NOT excluded — partial stays in the queue
    expect(listPending(root).length).toBe(1);
  });

  test("OLD write-once marker (no status) stays excluded — back-compat (9910c7ea/1c0831f7 unbroken)", () => {
    const root = makeTmpRoot();
    markPending(root, entry("legacy-one"));
    writeManifestRecords(root, { "legacy-one": { foldedAt: "2026-06-01", nodeCount: 68, edgeCount: 60 } });
    expect(listPending(root).map((e) => e.sessionId)).not.toContain("legacy-one");
    expect(listPending(root).length).toBe(0);
  });

  test("absent record stays listed (the 122-backlog case)", () => {
    const root = makeTmpRoot();
    markPending(root, entry("never-folded"));
    writeManifestRecords(root, {}); // session not in foldedSessions at all
    expect(listPending(root).map((e) => e.sessionId)).toContain("never-folded");
  });

  test("mixed manifest: governed-complete + legacy excluded; in-progress + absent kept", () => {
    const root = makeTmpRoot();
    for (const s of ["gc", "legacy", "ip", "absent"]) markPending(root, entry(s));
    writeManifestRecords(root, {
      gc: lifecycleMarker("governed-complete"),
      legacy: { foldedAt: "x", nodeCount: 1, edgeCount: 0 },
      ip: lifecycleMarker("in-progress"),
      // "absent" deliberately omitted
    });
    const ids = listPending(root).map((e) => e.sessionId).sort();
    expect(ids).toEqual(["absent", "ip"]);
  });
});

describe("pending-fold — write hygiene", () => {
  test("writePendingFold preserves unknown top-level keys (forward-compat)", () => {
    const root = makeTmpRoot();
    const p = pendingFoldPath(root);
    const f = readPendingFold(p);
    f.pending["a"] = entry("a");
    (f as Record<string, unknown>)["futureSlot"] = { rev: 7 };
    writePendingFold(p, f);

    const back = readPendingFold(p);
    expect((back as Record<string, unknown>)["futureSlot"]).toEqual({ rev: 7 });
    expect("a" in back.pending).toBe(true);
  });

  test("writePendingFold is atomic — no .tmp left behind", () => {
    const root = makeTmpRoot();
    markPending(root, entry("a"));
    const p = pendingFoldPath(root);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.existsSync(`${p}.tmp`)).toBe(false);
  });

  test("readPendingFold returns {pending:{}} on absent/invalid file", () => {
    const root = makeTmpRoot();
    expect(readPendingFold(pendingFoldPath(root))).toEqual({ pending: {} });
    fs.writeFileSync(pendingFoldPath(root), "not json{", "utf8");
    expect(readPendingFold(pendingFoldPath(root))).toEqual({ pending: {} });
  });
});
