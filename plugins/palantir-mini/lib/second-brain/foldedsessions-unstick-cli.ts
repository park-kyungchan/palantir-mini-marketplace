// @domain: LEARN
// GATED, IDEMPOTENT unstick CLI for ONE OLD write-once second-brain fold marker (W3 PIECE 3).
//
// PROBLEM (the live 1c0831f7 sticky partial): before the G2-A lifecycle marker existed, the
// engine wrote a WRITE-ONCE marker {foldedAt,nodeCount,edgeCount} with NO `status` field. The
// back-compat truth-table (markerIsGovernedComplete) reads any no-status marker as
// "governed-complete" — correct for sessions that WERE fully governed, but it ALSO masks
// 1c0831f7, whose graph was persisted yet whose verdicts were NEVER governed (0 events.jsonl
// resolution_verdicts). Such a marker can never be advanced by the bump-CLI (it no-ops on
// no-status records) and never re-folds (idempotency short-circuits on governed-complete).
//
// FIX: this CLI converts ONE such OLD write-once marker into an in-progress LIFECYCLE record
//   { status:"in-progress", graphBatchesPersisted:1, governedBatches:0, totalBatches:1, ... }
// so the GOVERN-ONLY engine path (scripts/fold.ts governOnlySession) can re-govern its persisted
// nodes WITHOUT re-extraction (decision #5 — cheap; the graph is already lineage-stamped +
// integrity-validated), and the bump-CLI can then flip it governed-complete.
//
// HARD GATES (fail-closed, never automatic):
//   - REQUIRES an explicit `--confirm` flag on the CLI. Without it the CLI REFUSES (prints the
//     plan + exits non-zero). This is the "MUST NOT run automatically" guard — no hook/agent can
//     trip it by accident; a human (or an explicitly-gated step) must pass --confirm.
//   - ONLY flips an OLD write-once marker (no `status` field). It REFUSES on:
//       * an absent marker          (nothing to unstick),
//       * a governed-complete record (already done — the no-status case is the ONLY ambiguous one,
//         and we only unstick when the operator asserts via --confirm that it is genuinely ungoverned),
//       * an already in-progress lifecycle record (already unstuck → idempotent no-op, changed:false).
//   - REQUIRES the persisted graph to contain >=1 node whose source.sessionId === the target
//     session (else there is nothing to govern-only — refuses, so we never strand an empty marker).
//   - PRESERVES every other manifest key + every sibling marker; writes under withManifestLock.
//
// SEPARATION (ssot/ontology-first-program.md:39): imports nothing from pm, never appends
// events.jsonl. It only rewrites ONE manifest marker the engine + bump-CLI co-own.
//
// Usage:
//   bun run lib/second-brain/foldedsessions-unstick-cli.ts <root> <sessionId> --confirm
//     (omit --confirm to DRY-RUN: prints the plan, mutates nothing, exits 2)

import * as fs from "fs";
import * as path from "path";
import { manifestPath, withManifestLock } from "./foldedsessions-bump-cli";

interface Manifest {
  foldedSessions?: Record<string, unknown>;
  [k: string]: unknown;
}

/** best-effort read; {} on absent/invalid (never throws). */
function readManifest(p: string): Manifest {
  if (!fs.existsSync(p)) return {};
  try {
    const raw = fs.readFileSync(p, "utf8");
    if (!raw.trim()) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as Manifest) : {};
  } catch {
    return {};
  }
}

/** Atomic tmp+rename write that PRESERVES every existing key. */
function writeManifest(p: string, manifest: Manifest): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, p);
}

/** join(root,"second-brain","graph.json") */
function graphJsonPath(root: string): string {
  return path.join(root, "second-brain", "graph.json");
}

/**
 * Count persisted graph nodes whose source.sessionId === sessionId. govern-only emits verdicts
 * ONLY for these, so >=1 is the precondition for a meaningful unstick. Defensive read: 0 on any error.
 */
function countSessionNodes(root: string, sessionId: string): number {
  try {
    const p = graphJsonPath(root);
    if (!fs.existsSync(p)) return 0;
    const g = JSON.parse(fs.readFileSync(p, "utf8")) as { nodes?: Array<{ source?: { sessionId?: string } }> };
    if (!Array.isArray(g.nodes)) return 0;
    return g.nodes.filter((n) => n?.source?.sessionId === sessionId).length;
  } catch {
    return 0;
  }
}

export type UnstickReason =
  | "no-record"          // marker absent → nothing to unstick
  | "already-lifecycle"  // already a status-bearing (in-progress or governed-complete) record → no-op
  | "no-session-nodes"   // graph has 0 nodes for this session → nothing to govern-only
  | "not-confirmed"      // --confirm withheld → dry-run, no mutation
  | "unstuck";           // flipped OLD write-once → in-progress

export interface UnstickResult {
  changed: boolean;
  reason: UnstickReason;
  /** the in-progress marker the unstick wrote (only on reason==="unstuck") */
  marker?: {
    status: "in-progress";
    graphBatchesPersisted: number;
    governedBatches: number;
    totalBatches: number;
    nodeCount: number;
    edgeCount: number;
    startedAt: string;
  };
  /** persisted nodes for this session (diagnostic; populated on dry-run + unstuck) */
  sessionNodeCount?: number;
}

/**
 * Convert ONE old write-once marker to an in-progress lifecycle record so govern-only can re-govern.
 *   - confirm=false → DRY-RUN: returns the would-be plan (reason "not-confirmed"), mutates nothing.
 *   - flips ONLY a no-status (old write-once) marker that has >=1 persisted session node.
 *   - REFUSES (changed:false) on absent / already-lifecycle / no-session-nodes records.
 * Idempotent: re-running after a successful unstick hits "already-lifecycle" (no-op).
 */
export function unstickMarker(root: string, sessionId: string, confirm: boolean): UnstickResult {
  const p = manifestPath(root);
  return withManifestLock(p, () => {
    const manifest = readManifest(p);
    const rec = manifest.foldedSessions?.[sessionId];

    if (!rec || typeof rec !== "object") return { changed: false, reason: "no-record" };
    // ONLY an OLD write-once marker (no `status` field) is unstick-able. A status-bearing record
    // (in-progress already unstuck, or governed-complete genuinely done) is left untouched.
    if ("status" in (rec as Record<string, unknown>)) {
      return { changed: false, reason: "already-lifecycle" };
    }

    const sessionNodeCount = countSessionNodes(root, sessionId);
    if (sessionNodeCount === 0) {
      return { changed: false, reason: "no-session-nodes", sessionNodeCount };
    }

    const legacy = rec as Record<string, unknown>;
    const nodeCount = typeof legacy.nodeCount === "number" ? legacy.nodeCount : sessionNodeCount;
    const edgeCount = typeof legacy.edgeCount === "number" ? legacy.edgeCount : 0;
    // startedAt: keep the original foldedAt if present (preserves provenance), else now.
    const startedAt = typeof legacy.foldedAt === "string" ? legacy.foldedAt : new Date().toISOString();

    const marker = {
      status: "in-progress" as const,
      graphBatchesPersisted: 1, // govern-only treats the persisted graph as ONE synthetic batch
      governedBatches: 0,       // nothing governed yet — that is the whole point
      totalBatches: 1,
      nodeCount,
      edgeCount,
      startedAt,
    };

    if (!confirm) {
      // DRY-RUN: surface the plan, mutate NOTHING (the "must not run automatically" guard).
      return { changed: false, reason: "not-confirmed", marker, sessionNodeCount };
    }

    manifest.foldedSessions = manifest.foldedSessions ?? {};
    manifest.foldedSessions[sessionId] = marker;
    writeManifest(p, manifest);
    return { changed: true, reason: "unstuck", marker, sessionNodeCount };
  });
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const confirm = argv.includes("--confirm");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const [root, sessionId] = positional;
  if (!root || !sessionId) {
    process.stderr.write(
      "usage: foldedsessions-unstick-cli.ts <root> <sessionId> --confirm  (omit --confirm to dry-run)\n",
    );
    process.exit(1);
  }
  try {
    const r = unstickMarker(root, sessionId, confirm);
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    // Non-zero exit on a dry-run so a caller cannot mistake a plan for a completed unstick.
    process.exit(r.changed ? 0 : r.reason === "not-confirmed" ? 2 : 1);
  } catch (e) {
    process.stderr.write(`foldedsessions-unstick-cli: ${(e as Error).message}\n`);
    process.exit(1);
  }
}
