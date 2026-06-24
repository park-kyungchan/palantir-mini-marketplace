// palantir-mini — foldedsessions-unstick-cli tests (W3 PIECE 3, LEARN lane).
// The unstick CLI converts ONE old write-once fold marker into an in-progress lifecycle record
// so the govern-only engine path can re-govern it. It is GATED (--confirm required), idempotent,
// scope-checked (>=1 persisted session node), and REFUSES on absent / already-lifecycle markers.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { unstickMarker } from "../../../lib/second-brain/foldedsessions-unstick-cli";
import { manifestPath } from "../../../lib/second-brain/foldedsessions-bump-cli";

const tmpDirs: string[] = [];

function makeTmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-unstick-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, "second-brain"), { recursive: true });
  return dir;
}

function writeManifest(root: string, records: Record<string, unknown>, extra: Record<string, unknown> = {}): void {
  fs.writeFileSync(
    manifestPath(root),
    JSON.stringify({ foldedSessions: records, ...extra }, null, 2) + "\n",
    "utf8",
  );
}

/** Persist a graph.json with `n` nodes for `sessionId` (+ optional `otherCount` foreign-session nodes). */
function writeGraph(root: string, sessionId: string, n: number, otherSession = "other", otherCount = 0): void {
  const nodes: unknown[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `n_${sessionId}_${i}`, type: "thesis", text: `fact-${i}`, provenance: "internal",
      canonicalKey: `fact-${i}`, derived_from: [`${sessionId}-u1`],
      source: { sourceId: sessionId, sessionId, turnUuid: `${sessionId}-u1` },
    });
  }
  for (let i = 0; i < otherCount; i++) {
    nodes.push({
      id: `n_${otherSession}_${i}`, type: "entity", text: `foreign-${i}`, provenance: "external",
      canonicalKey: `foreign-${i}`, derived_from: [`${otherSession}-u1`],
      source: { sourceId: otherSession, sessionId: otherSession, turnUuid: `${otherSession}-u1` },
    });
  }
  fs.writeFileSync(path.join(root, "second-brain", "graph.json"), JSON.stringify({ nodes, edges: [] }, null, 2) + "\n", "utf8");
}

function readRec(root: string, sessionId: string): Record<string, unknown> {
  const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
  return m.foldedSessions[sessionId];
}

/** The live-shaped OLD write-once marker (no status field). */
const OLD_MARKER = { foldedAt: "2026-06-23T09:50:08.378Z", nodeCount: 68, edgeCount: 60 };

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("unstick-CLI — gate (--confirm)", () => {
  test("DRY-RUN (confirm=false): returns the plan, mutates NOTHING (the no-auto-run guard)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { sid: { ...OLD_MARKER } });
    writeGraph(root, "sid", 67, "other", 1); // 67 own nodes + 1 foreign (mirrors live 1c0831f7)
    const before = fs.readFileSync(manifestPath(root), "utf8");

    const r = unstickMarker(root, "sid", /*confirm*/ false);
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("not-confirmed");
    expect(r.marker?.status).toBe("in-progress");
    expect(r.marker?.governedBatches).toBe(0);
    expect(r.sessionNodeCount).toBe(67); // scoped to sid's OWN nodes, not all 68
    // manifest byte-UNCHANGED — a dry-run is read-only
    expect(fs.readFileSync(manifestPath(root), "utf8")).toBe(before);
    // the marker on disk is STILL the old write-once shape
    expect(readRec(root, "sid")).toEqual(OLD_MARKER);
  });

  test("CONFIRM=true: flips OLD write-once → in-progress {1 batch, gov 0}, preserves provenance + siblings", () => {
    const root = makeTmpRoot();
    writeManifest(
      root,
      { sid: { ...OLD_MARKER }, sibling: { foldedAt: "x", nodeCount: 1, edgeCount: 0 } },
      { envelopeRev: 9, projectionCheckpoint: { at: 7 } },
    );
    writeGraph(root, "sid", 67);

    const r = unstickMarker(root, "sid", /*confirm*/ true);
    expect(r.changed).toBe(true);
    expect(r.reason).toBe("unstuck");

    const rec = readRec(root, "sid");
    expect(rec.status).toBe("in-progress");
    expect(rec.graphBatchesPersisted).toBe(1); // ONE synthetic batch
    expect(rec.governedBatches).toBe(0);        // nothing governed yet
    expect(rec.totalBatches).toBe(1);
    expect(rec.nodeCount).toBe(68);             // carried from the legacy marker
    expect(rec.edgeCount).toBe(60);
    expect(rec.startedAt).toBe("2026-06-23T09:50:08.378Z"); // legacy foldedAt → startedAt (provenance)
    expect(rec.foldedAt).toBeUndefined();       // no foldedAt until the governed flip

    // sibling marker + unknown top-level keys UNCHANGED
    const m = JSON.parse(fs.readFileSync(manifestPath(root), "utf8"));
    expect(m.foldedSessions.sibling).toEqual({ foldedAt: "x", nodeCount: 1, edgeCount: 0 });
    expect(m.envelopeRev).toBe(9);
    expect(m.projectionCheckpoint).toEqual({ at: 7 });
    expect(fs.existsSync(`${manifestPath(root)}.tmp`)).toBe(false); // atomic, no .tmp
  });
});

describe("unstick-CLI — refusals (fail-closed)", () => {
  test("REFUSES an absent record (no-record, no mutation)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { someone: { ...OLD_MARKER } });
    writeGraph(root, "someone", 5);
    const before = fs.readFileSync(manifestPath(root), "utf8");
    const r = unstickMarker(root, "ghost", true);
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("no-record");
    expect(fs.readFileSync(manifestPath(root), "utf8")).toBe(before);
  });

  test("REFUSES an already governed-complete lifecycle record (already-lifecycle, untouched)", () => {
    const root = makeTmpRoot();
    const done = { status: "governed-complete", graphBatchesPersisted: 1, governedBatches: 1, totalBatches: 1, nodeCount: 5, edgeCount: 0, startedAt: "x", foldedAt: "y" };
    writeManifest(root, { done });
    writeGraph(root, "done", 5);
    const r = unstickMarker(root, "done", true);
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("already-lifecycle");
    expect(readRec(root, "done")).toEqual(done);
  });

  test("REFUSES an already in-progress lifecycle record (already-lifecycle → idempotent no-op)", () => {
    const root = makeTmpRoot();
    const inprog = { status: "in-progress", graphBatchesPersisted: 1, governedBatches: 0, totalBatches: 1, nodeCount: 67, edgeCount: 60, startedAt: "x" };
    writeManifest(root, { sid: inprog });
    writeGraph(root, "sid", 67);
    const r = unstickMarker(root, "sid", true);
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("already-lifecycle");
    expect(readRec(root, "sid")).toEqual(inprog);
  });

  test("REFUSES when the graph has 0 nodes for this session (no-session-nodes — never strand an empty marker)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { sid: { ...OLD_MARKER } });
    writeGraph(root, "different-session", 5); // graph has nodes, but NONE for sid
    const r = unstickMarker(root, "sid", true);
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("no-session-nodes");
    expect(r.sessionNodeCount).toBe(0);
    expect(readRec(root, "sid")).toEqual(OLD_MARKER); // untouched
  });
});

describe("unstick-CLI — idempotency", () => {
  test("unstick then unstick again → second is a no-op (already-lifecycle)", () => {
    const root = makeTmpRoot();
    writeManifest(root, { sid: { ...OLD_MARKER } });
    writeGraph(root, "sid", 67);

    const first = unstickMarker(root, "sid", true);
    expect(first.changed).toBe(true);
    expect(first.reason).toBe("unstuck");

    const second = unstickMarker(root, "sid", true);
    expect(second.changed).toBe(false);
    expect(second.reason).toBe("already-lifecycle"); // the flip already happened
    expect(readRec(root, "sid").status).toBe("in-progress");
    expect(readRec(root, "sid").governedBatches).toBe(0);
  });
});
