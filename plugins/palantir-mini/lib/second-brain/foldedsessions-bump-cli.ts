// @domain: LEARN
// Runtime-neutral bump-CLI for the second-brain fold lifecycle marker (G2-A).
//
// The fold engine (harness-side, scripts/fold.ts) owns graph.json (Layer-2) and bumps the
// ENGINE side of the foldedSessions marker: status="in-progress" + graphBatchesPersisted +
// totalBatches after each persisted batch. THIS CLI owns the GOVERNED side: AFTER the
// streaming adapter's gated emit_event for a batch's verdicts succeeds, it bumps
// governedBatches and — once governedBatches === graphBatchesPersisted === totalBatches —
// flips status="governed-complete" + stamps foldedAt. That flip is the SOLE transition to
// the engine's idempotency-short-circuit / listPending "done" state.
//
// SEPARATION (ssot/ontology-first-program.md:39): this is NOT pm — it imports nothing from
// pm, never appends events.jsonl, and is invoked by whichever ADAPTER (Claude Agent / Codex
// worker) fulfils the run. It only mutates the manifest marker the engine and it co-own.
//
// TWO-WRITER SAFETY: the engine writes status/graphBatchesPersisted/totalBatches/nodeCount/
// edgeCount/startedAt and PRESERVES governedBatches; this CLI writes ONLY governedBatches
// (and status/foldedAt on the flip) and PRESERVES every engine field. Each writer reads the
// FULL manifest fresh, mutates only its own keys, and writes via the SAME atomic
// preserve-every-key tmp+rename — so the last writer carries the other's already-persisted
// fields and neither clobbers.
//
// Usage:
//   bun run lib/second-brain/foldedsessions-bump-cli.ts bump <root> <sessionId> [<batchIndex>]
//     - batchIndex present  -> idempotent SET: governedBatches = max(cur, batchIndex+1)
//                              (resume-safe: re-bumping an already-governed batch is a no-op)
//     - batchIndex absent   -> increment:      governedBatches = cur + 1
// Best-effort: always exits 0; errors go to stderr.

import * as fs from "fs";
import * as path from "path";

/** A lifecycle fold marker (shape mirrored from scripts/fold.ts FoldMarker). */
interface FoldMarker {
  status: "in-progress" | "governed-complete";
  graphBatchesPersisted: number;
  governedBatches: number;
  totalBatches: number;
  nodeCount: number;
  edgeCount: number;
  startedAt: string;
  foldedAt?: string;
}

interface Manifest {
  foldedSessions?: Record<string, unknown>;
  [k: string]: unknown;
}

/** join(root,"second-brain","manifest.json") */
export function manifestPath(root: string): string {
  return path.join(root, "second-brain", "manifest.json");
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

/** Atomic tmp+rename write that PRESERVES every existing key (never clobbers). */
function writeManifest(p: string, manifest: Manifest): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, p);
}

/* ------------------------------ manifest two-writer lock (W3 §residual-3) ------------------------------ *
 * BYTE-PARALLEL to second-brain/src/store.ts withManifestLock: the ENGINE (harness repo) and this
 * BUMP-CLI (pm repo) RMW the SAME manifest from different processes. Both honor the SAME ephemeral
 * lockfile (`<manifestPath>.lock`) so their read→mutate→write critical sections serialize and a
 * concurrent disjoint-field RMW cannot lost-update. Best-effort + FAIL-OPEN: if the lock can't be
 * acquired within LOCK_MAX_WAIT_MS the section runs unlocked (degrades to the prior unlocked RMW,
 * never hangs). Always releases a lock it took. Kept self-contained (no cross-repo import).
 * --------------------------------------------------------------------------- */
const LOCK_STALE_MS = 10_000;
const LOCK_SPIN_MS = 15;
const LOCK_MAX_WAIT_MS = 3_000;

function sleepSyncMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

export function withManifestLock<T>(lockTarget: string, fn: () => T): T {
  const lockPath = `${lockTarget}.lock`;
  let held = false;
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const fd = fs.openSync(lockPath, "wx"); // atomic create-or-fail; EEXIST if held
      fs.writeFileSync(fd, `${process.pid}@${new Date().toISOString()}\n`, "utf8");
      fs.closeSync(fd);
      held = true;
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") break; // unexpected → proceed unlocked
      try {
        const age = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (age > LOCK_STALE_MS) { fs.unlinkSync(lockPath); continue; } // reclaim stale lock
      } catch { /* vanished → retry */ }
      sleepSyncMs(LOCK_SPIN_MS);
    }
  }
  try {
    return fn();
  } finally {
    if (held) { try { fs.unlinkSync(lockPath); } catch { /* already gone */ } }
  }
}

/**
 * A record is a lifecycle marker the bump-CLI may advance IFF it is an in-progress lifecycle
 * record. An OLD write-once marker (no status) is governed-complete by back-compat and is
 * NEVER advanced (un-sticking those is Wave 3); an already governed-complete record is done.
 */
function isAdvanceableInProgress(rec: unknown): rec is FoldMarker {
  if (!rec || typeof rec !== "object") return false;
  const r = rec as Record<string, unknown>;
  if (!("status" in r)) return false; // OLD write-once = done, not advanceable
  return r.status === "in-progress";
}

export interface BumpResult {
  changed: boolean;
  reason: "no-record" | "old-no-status" | "already-complete" | "bumped";
  governedBatches?: number;
  flipped?: boolean;
}

/**
 * Bump the GOVERNED counter for one session's in-progress lifecycle marker.
 *   - no-ops (changed:false) on an absent record, an OLD write-once (no-status) record, or an
 *     already governed-complete record.
 *   - otherwise sets governedBatches:
 *       toBatchIndex !== undefined -> max(cur, toBatchIndex+1)   (idempotent SET, resume-safe)
 *       toBatchIndex === undefined -> cur + 1                    (increment)
 *     mutates ONLY governedBatches, and flips status="governed-complete" + foldedAt when
 *     governedBatches === graphBatchesPersisted === totalBatches.
 * Reads the manifest FRESH and writes the FULL object back (two-writer-safe).
 */
export function bumpGoverned(root: string, sessionId: string, toBatchIndex?: number): BumpResult {
  const p = manifestPath(root);
  // TWO-WRITER LOCK (W3 §residual-3): serialize the read→mutate→write critical section against
  // the engine's concurrent marker write. The manifest is RE-READ INSIDE the lock so a stale
  // pre-lock snapshot can never clobber an engine write that landed while we waited.
  return withManifestLock(p, () => {
    const manifest = readManifest(p);
    const folded = manifest.foldedSessions;
    const rec = folded?.[sessionId];

    if (!rec || typeof rec !== "object") return { changed: false, reason: "no-record" };
    if (!("status" in (rec as Record<string, unknown>))) {
      return { changed: false, reason: "old-no-status" };
    }
    if (!isAdvanceableInProgress(rec)) {
      // status present but not in-progress → already governed-complete
      return { changed: false, reason: "already-complete" };
    }

    // Mutate ONLY the governed field of THIS record (disjoint from the engine's fields).
    const cur = typeof rec.governedBatches === "number" ? rec.governedBatches : 0;
    const next = toBatchIndex !== undefined ? Math.max(cur, toBatchIndex + 1) : cur + 1;
    rec.governedBatches = next;

    // Flip to governed-complete on counter agreement (the shared predicate).
    let flipped = false;
    if (
      rec.governedBatches === rec.graphBatchesPersisted &&
      rec.graphBatchesPersisted === rec.totalBatches
    ) {
      rec.status = "governed-complete";
      rec.foldedAt = new Date().toISOString();
      flipped = true;
    }

    // folded is non-null here (rec came from it); write the FULL manifest back atomically.
    writeManifest(p, manifest);
    return { changed: true, reason: "bumped", governedBatches: next, flipped };
  });
}

if (import.meta.main) {
  const [, , cmd, root, sessionId, batchIndexRaw] = process.argv;
  try {
    if (cmd === "bump" && root && sessionId) {
      const toBatchIndex =
        batchIndexRaw !== undefined && batchIndexRaw !== "" && !Number.isNaN(Number(batchIndexRaw))
          ? Number(batchIndexRaw)
          : undefined;
      const r = bumpGoverned(root, sessionId, toBatchIndex);
      process.stdout.write(JSON.stringify(r) + "\n");
    } else {
      process.stderr.write(
        "usage: foldedsessions-bump-cli.ts bump <root> <sessionId> [<batchIndex>]\n",
      );
    }
  } catch (e) {
    process.stderr.write(`foldedsessions-bump-cli: ${(e as Error).message}\n`);
  }
  process.exit(0);
}
