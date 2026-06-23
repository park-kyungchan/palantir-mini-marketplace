// palantir-mini — foldedsessions-bump-cli tests (G2-A governed-side bump, LEARN lane).
// The bump-CLI owns the GOVERNED counter of the fold lifecycle marker: it bumps
// governedBatches after each batch's gated emit_event and flips status="governed-complete"
// on counter agreement. It mutates ONLY governedBatches (+ status/foldedAt on the flip),
// preserving every engine field and every other manifest key (two-writer-safe).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { bumpGoverned, manifestPath } from "../../../lib/second-brain/foldedsessions-bump-cli";

const tmpDirs: string[] = [];

function makeTmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-bump-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, "second-brain"), { recursive: true });
  return dir;
}

/** Write a manifest with the given foldedSessions records + any extra top-level keys. */
function writeManifest(root: string, records: Record<string, unknown>, extra: Record<string, unknown> = {}): void {
  fs.writeFileSync(
    manifestPath(root),
    JSON.stringify({ foldedSessions: records, ...extra }, null, 2) + "\n",
    "utf8",
  );
}

function readRec(root: string, sessionId: string): Record<string, unknown> {
  const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
  return m.foldedSessions[sessionId];
}

/** An engine-written in-progress lifecycle marker (totalBatches batches persisted, 0 governed). */
function engineMarker(totalBatches: number, governedBatches = 0): Record<string, unknown> {
  return {
    status: "in-progress",
    graphBatchesPersisted: totalBatches,
    governedBatches,
    totalBatches,
    nodeCount: totalBatches * 3,
    edgeCount: 0,
    startedAt: "2026-06-23T00:00:00.000Z",
  };
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("bump-CLI — increment + flip + preservation", () => {
  test("bump x3 → governedBatches 1,2,3; flip+foldedAt on the 3rd; engine fields + envelopeRev + sibling UNCHANGED; no .tmp", () => {
    const root = makeTmpRoot();
    writeManifest(
      root,
      {
        sid: engineMarker(3),
        other: engineMarker(2), // a SIBLING marker that must NOT change
      },
      { envelopeRev: 7, projectionCheckpoint: { at: 42 } }, // unknown top-level keys must survive
    );

    // bump 1 → governedBatches 1, still in-progress (1 !== 3)
    const r1 = bumpGoverned(root, "sid");
    expect(r1.changed).toBe(true);
    expect(r1.governedBatches).toBe(1);
    expect(r1.flipped).toBe(false);
    expect(readRec(root, "sid").status).toBe("in-progress");
    expect(readRec(root, "sid").governedBatches).toBe(1);

    // bump 2 → governedBatches 2, still in-progress
    const r2 = bumpGoverned(root, "sid");
    expect(r2.governedBatches).toBe(2);
    expect(r2.flipped).toBe(false);

    // bump 3 → governedBatches 3 === graphBatchesPersisted === totalBatches → FLIP
    const r3 = bumpGoverned(root, "sid");
    expect(r3.governedBatches).toBe(3);
    expect(r3.flipped).toBe(true);
    const flipped = readRec(root, "sid");
    expect(flipped.status).toBe("governed-complete");
    expect(typeof flipped.foldedAt).toBe("string");

    // ENGINE fields on sid PRESERVED (only governedBatches/status/foldedAt changed)
    expect(flipped.graphBatchesPersisted).toBe(3);
    expect(flipped.totalBatches).toBe(3);
    expect(flipped.nodeCount).toBe(9);
    expect(flipped.startedAt).toBe("2026-06-23T00:00:00.000Z");

    // SIBLING marker + unknown top-level keys UNCHANGED
    const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect(m.foldedSessions.other).toEqual(engineMarker(2));
    expect(m.envelopeRev).toBe(7);
    expect(m.projectionCheckpoint).toEqual({ at: 42 });

    // atomic write — no .tmp left behind
    expect(fs.existsSync(`${manifestPath(root)}.tmp`)).toBe(false);
  });

  test("increment-mode flip with a single batch (total=1): one bump flips immediately", () => {
    const root = makeTmpRoot();
    writeManifest(root, { solo: engineMarker(1) });
    const r = bumpGoverned(root, "solo");
    expect(r.governedBatches).toBe(1);
    expect(r.flipped).toBe(true);
    expect(readRec(root, "solo").status).toBe("governed-complete");
  });
});

describe("bump-CLI — idempotent SET (resume over-emit safe)", () => {
  test("bump(sid,0) twice → governedBatches stays 1 (max(cur, batchIndex+1))", () => {
    const root = makeTmpRoot();
    writeManifest(root, { sid: engineMarker(3) });

    const a = bumpGoverned(root, "sid", 0); // SET to max(0, 0+1) = 1
    expect(a.governedBatches).toBe(1);
    const b = bumpGoverned(root, "sid", 0); // SET to max(1, 0+1) = 1 — no regression, no advance
    expect(b.governedBatches).toBe(1);
    expect(readRec(root, "sid").governedBatches).toBe(1);
    expect(readRec(root, "sid").status).toBe("in-progress");
  });

  test("SET never regresses governedBatches (a stale lower batchIndex is a no-op advance)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { sid: engineMarker(3, 2) }); // already governed 2 batches
    const r = bumpGoverned(root, "sid", 0); // max(2, 0+1) = 2 — stays
    expect(r.governedBatches).toBe(2);
  });

  test("SET to the last batch index flips (batchIndex 2 on total=3 → governedBatches 3)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { sid: engineMarker(3, 2) }); // 2 governed, persisting batch index 2
    const r = bumpGoverned(root, "sid", 2); // max(2, 2+1) = 3 → flip
    expect(r.governedBatches).toBe(3);
    expect(r.flipped).toBe(true);
    expect(readRec(root, "sid").status).toBe("governed-complete");
  });
});

describe("bump-CLI — two-writer no-clobber interleave", () => {
  test("engine-write then bump → governedBatches holds the bump, engine fields hold the engine write (neither zeroed)", () => {
    const root = makeTmpRoot();
    // (1) engine writes batch 1 (graphBatchesPersisted:1, governedBatches preserved 0)
    writeManifest(root, { sid: engineMarker(1) });
    // (2) bump governs batch 0 → governedBatches 1 (and flips, since 1===1===1)
    const r1 = bumpGoverned(root, "sid", 0);
    expect(r1.governedBatches).toBe(1);

    // (3) the ENGINE now re-runs a resume and writes a FRESH in-progress record for more batches
    //     (graphBatchesPersisted:3), PRESERVING the governedBatches the bump set. We simulate the
    //     engine's disjoint-field RMW: read full manifest, mutate only engine fields, preserve gov.
    const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    const priorGov = m.foldedSessions.sid.governedBatches;
    m.foldedSessions.sid = {
      status: "in-progress",
      graphBatchesPersisted: 3,
      governedBatches: priorGov, // engine PRESERVES the governed field
      totalBatches: 3,
      nodeCount: 9,
      edgeCount: 0,
      startedAt: "2026-06-23T00:00:00.000Z",
    };
    fs.writeFileSync(manifestPath(root), JSON.stringify(m, null, 2) + "\n", "utf8");

    // (4) bump governs batch 1 → governedBatches 2; engine's graphBatchesPersisted:3 held
    const r2 = bumpGoverned(root, "sid", 1);
    expect(r2.governedBatches).toBe(2);
    const rec = readRec(root, "sid");
    expect(rec.governedBatches).toBe(2); // bump's field held
    expect(rec.graphBatchesPersisted).toBe(3); // engine's field NOT zeroed by the bump
    expect(rec.totalBatches).toBe(3);
    expect(rec.status).toBe("in-progress"); // 2 !== 3 → not yet complete
  });
});

describe("bump-CLI — no-op cases (back-compat + already-complete)", () => {
  test("bump on an OLD write-once (no status) record is a no-op (un-sticking is Wave 3)", () => {
    const root = makeTmpRoot();
    const legacy = { foldedAt: "2026-06-01", nodeCount: 68, edgeCount: 60 };
    writeManifest(root, { legacy });
    const r = bumpGoverned(root, "legacy");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("old-no-status");
    expect(readRec(root, "legacy")).toEqual(legacy); // untouched
  });

  test("bump on an already governed-complete record is a no-op", () => {
    const root = makeTmpRoot();
    const done = { status: "governed-complete", graphBatchesPersisted: 3, governedBatches: 3, totalBatches: 3, nodeCount: 9, edgeCount: 0, startedAt: "x", foldedAt: "y" };
    writeManifest(root, { done });
    const r = bumpGoverned(root, "done");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("already-complete");
    expect(readRec(root, "done")).toEqual(done); // untouched
  });

  test("bump on an absent record is a no-op (no manifest mutation)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { someone: engineMarker(2) });
    const before = fs.readFileSync(manifestPath(root), "utf8");
    const r = bumpGoverned(root, "nobody");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("no-record");
    expect(fs.readFileSync(manifestPath(root), "utf8")).toBe(before); // byte-stable
  });

  test("bump with no manifest file at all is a no-op (no-record, no throw)", () => {
    const root = makeTmpRoot();
    const r = bumpGoverned(root, "ghost");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("no-record");
  });
});
