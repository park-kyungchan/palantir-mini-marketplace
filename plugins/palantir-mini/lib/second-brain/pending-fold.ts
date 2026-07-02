// @domain: LEARN
// Deterministic pending-fold bookmark for the model-driven second-brain fold.
// The Stop hook marks the just-ended session pending (NO LLM). The model-driven
// fold subagent clears it on a successful engine run. SessionStart reads it to
// decide whether to inject the fold-trigger additionalContext.
//
// W3 (destructive): manifest.json.foldedSessions is now the SOLE persisted
// fold-state store. There is NO separate pending-fold.json write path anymore —
// markPending() writes an explicit status:"pending" entry directly into
// manifest.json.foldedSessions[sessionId], under the SAME two-writer file lock
// the bump-CLI (lib/second-brain/foldedsessions-bump-cli.ts) already uses for
// manifest RMW. listPending() derives the pending set purely by filtering
// manifest entries whose status === "pending".
//
// STATUS LITERALS (the complete FoldMarker.status union, used consistently
// everywhere — types, filters, and call sites):
//   "pending"           — bookmarked by the Stop hook / SessionStart back-fill;
//                          not yet picked up by the model-driven fold.
//   "in-progress"        — the engine has persisted >=1 batch; governed emit may
//                          still be catching up (see foldedsessions-bump-cli.ts).
//   "governed-complete"  — the fold's governed emit fully landed (terminal).
//
// MIGRATION: a prior release wrote a SEPARATE `<project>/second-brain/pending-fold.json`
// queue file. migrateLegacyPendingFile() (below) folds any surviving legacy file's
// entries into manifest.json.foldedSessions (as status:"pending", never clobbering
// an existing further-along record), then renames the legacy file to
// "pending-fold.json.migrated" so it is never re-read. Idempotent — safe to call
// on every Stop-hook / pending-list read, from any process, any number of times.

import * as fs from "fs";
import * as path from "path";
import { manifestPath, withManifestLock } from "./foldedsessions-bump-cli";

/** Sole authoritative status union for a foldedSessions[sessionId] record written by this module. */
export type PendingFoldStatus = "pending";

/** The bookmark fields carried on a status:"pending" manifest entry. */
export interface PendingFoldEntry {
  sessionId:      string;
  transcriptPath: string;
  bookmarkedAt:   string;   // ISO
  runtime:        string;   // resolveHostRuntimeIdentity() at Stop time (advisory)
}

/** The full status:"pending" manifest record shape (PendingFoldEntry + discriminant). */
export interface PendingFoldMarker extends PendingFoldEntry {
  status: "pending";
}

interface Manifest {
  foldedSessions?: Record<string, unknown>;
  [k: string]: unknown;
}

/** @deprecated legacy pending-fold.json path — kept ONLY for migrateLegacyPendingFile(). */
interface LegacyPendingFoldFile {
  pending: Record<string, PendingFoldEntry>;
  [k: string]: unknown;
}

/** join(root,"second-brain","pending-fold.json") — the LEGACY (pre-manifest-authority) path. */
export function pendingFoldPath(root: string): string {
  return path.join(root, "second-brain", "pending-fold.json");
}

/** join(root,"second-brain","pending-fold.json.migrated") — post-migration rename target. */
export function migratedPendingFoldPath(root: string): string {
  return `${pendingFoldPath(root)}.migrated`;
}

/**
 * True IFF the transcript's FIRST line parses to {type:"queue-operation"} — the
 * fold engine's CLI-extraction byproducts (NOT real Claude sessions). SessionStart
 * uses this to exclude such files from the detect set so the fold engine does not
 * self-feed (a queue-operation transcript would otherwise be back-filled pending and
 * re-trigger a fold, whose own CLI run writes another queue-operation transcript...).
 *
 * Best-effort: reads the WHOLE first line in bounded chunks (openSync/readSync,
 * growing until a newline is seen or EOF) and parses it. A 2KB-capped read silently
 * mis-classified a queue-operation row whose first line exceeded 2KB — the truncated
 * prefix failed JSON.parse, the row was NOT excluded, and the fold engine re-detected
 * its own byproduct. On ANY read/parse error returns FALSE — a real session is NEVER
 * dropped on error; only a positively-identified queue-operation row is excluded.
 */
export function isQueueOperationTranscript(file: string): boolean {
  let fd: number | undefined;
  try {
    fd = fs.openSync(file, "r");
    const CHUNK = 4096;
    const chunk = Buffer.alloc(CHUNK);
    let firstLine = "";
    let offset = 0;
    // Grow the read until the first newline lands in the accumulated text or EOF.
    // No fixed cap: a queue-operation header line >2KB still parses + excludes.
    for (;;) {
      const bytes = fs.readSync(fd, chunk, 0, CHUNK, offset);
      if (bytes <= 0) break;
      offset += bytes;
      const newlineIdx = chunk.indexOf(0x0a, 0); // 0x0a = "\n"
      if (newlineIdx >= 0 && newlineIdx < bytes) {
        firstLine += chunk.toString("utf8", 0, newlineIdx);
        break;
      }
      firstLine += chunk.toString("utf8", 0, bytes);
      if (bytes < CHUNK) break; // short read ⇒ EOF, no newline (single-line file)
    }
    firstLine = firstLine.trim();
    if (!firstLine) return false;
    const obj = JSON.parse(firstLine) as { type?: unknown };
    return obj?.type === "queue-operation";
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* best-effort */ }
    }
  }
}

/** best-effort read; {} on absent/invalid (never throws). Mirrors foldedsessions-bump-cli's readManifest. */
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

/**
 * Bookmark ONE session as pending directly in manifest.json.foldedSessions[sessionId],
 * under the SAME two-writer manifest lock the bump-CLI uses. Idempotent on sessionId:
 * re-marking an already-"pending" session just refreshes its bookmark fields.
 *
 * PRECEDENCE: markPending() NEVER clobbers an existing record whose status is further
 * along than "pending" (i.e. "in-progress" or "governed-complete", OR an OLD write-once
 * legacy record with no `status` field at all, which back-compat treats as done). Those
 * records mean the session already has engine-side progress or is fully governed — a
 * fresh Stop-hook bookmark must not regress that state back to "pending". Only an ABSENT
 * record or an existing "pending" record is written/refreshed.
 */
export function markPending(root: string, e: PendingFoldEntry): void {
  const p = manifestPath(root);
  withManifestLock(p, () => {
    const manifest = readManifest(p);
    manifest.foldedSessions = manifest.foldedSessions ?? {};
    const existing = manifest.foldedSessions[e.sessionId];
    if (existing && typeof existing === "object") {
      const rec = existing as Record<string, unknown>;
      const isPending = rec.status === "pending";
      if (!isPending) {
        // Further-along (in-progress / governed-complete) or legacy no-status record
        // — leave it untouched (precedence: never regress a superseding record).
        return;
      }
    }
    manifest.foldedSessions[e.sessionId] = {
      status:         "pending",
      sessionId:      e.sessionId,
      transcriptPath: e.transcriptPath,
      bookmarkedAt:   e.bookmarkedAt,
      runtime:        e.runtime,
    } satisfies PendingFoldMarker;
    writeManifest(p, manifest);
  });
}

/**
 * Clear a session's status:"pending" bookmark. No-op on an absent record OR a record
 * that is NOT status:"pending" (an in-progress/governed-complete/legacy record is never
 * touched by clearPending — only a pure pending bookmark is removable this way).
 */
export function clearPending(root: string, sessionId: string): void {
  const p = manifestPath(root);
  withManifestLock(p, () => {
    const manifest = readManifest(p);
    const folded = manifest.foldedSessions;
    if (!folded) return;
    const rec = folded[sessionId];
    if (!rec || typeof rec !== "object") return;
    if ((rec as Record<string, unknown>).status !== "pending") return;
    delete folded[sessionId];
    writeManifest(p, manifest);
  });
}

/**
 * Read manifest.json.foldedSessions defensively (best-effort; {} on any error).
 */
function readFoldedSessions(root: string): Record<string, unknown> {
  try {
    const p = manifestPath(root);
    if (!fs.existsSync(p)) return {};
    const manifest = JSON.parse(fs.readFileSync(p, "utf8")) as {
      foldedSessions?: Record<string, unknown>;
    };
    return manifest.foldedSessions ?? {};
  } catch {
    return {};
  }
}

/**
 * Entries whose fold is GOVERNED-COMPLETE (explicit status-literal match only — the
 * legacy no-status special-casing this function used to perform was REMOVED under W3;
 * every OLD write-once marker was migrated forward or is treated as NOT governed-complete
 * going forward). A record is governed-complete IFF `status === "governed-complete"`.
 */
export function markerIsGovernedComplete(rec: unknown): boolean {
  if (!rec || typeof rec !== "object") return false;
  const r = rec as Record<string, unknown>;
  return r.status === "governed-complete";
}

/**
 * Sessions currently bookmarked status:"pending" in manifest.json.foldedSessions.
 * Calls migrateLegacyPendingFile() first (idempotent) so a surviving legacy
 * pending-fold.json is folded forward before listing — whichever of the Stop hook
 * or this read path runs first performs the migration; running both is harmless.
 */
export function listPending(root: string): PendingFoldEntry[] {
  migrateLegacyPendingFile(root);
  const folded = readFoldedSessions(root);
  const out: PendingFoldEntry[] = [];
  for (const rec of Object.values(folded)) {
    if (!rec || typeof rec !== "object") continue;
    const r = rec as Record<string, unknown>;
    if (r.status !== "pending") continue;
    if (typeof r.sessionId !== "string") continue;
    if (typeof r.transcriptPath !== "string") continue;
    if (typeof r.bookmarkedAt !== "string") continue;
    if (typeof r.runtime !== "string") continue;
    out.push({
      sessionId:      r.sessionId,
      transcriptPath: r.transcriptPath,
      bookmarkedAt:   r.bookmarkedAt,
      runtime:        r.runtime,
    });
  }
  return out;
}

/**
 * Best-effort read of the LEGACY pending-fold.json file. Exists ONLY to support
 * migrateLegacyPendingFile(); {pending:{}} on absent/invalid. Not used by any
 * live listing/marking path anymore (manifest.json.foldedSessions is sole authority).
 */
function readLegacyPendingFold(p: string): LegacyPendingFoldFile {
  if (!fs.existsSync(p)) return { pending: {} };
  try {
    const raw = fs.readFileSync(p, "utf8");
    if (!raw.trim()) return { pending: {} };
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return { pending: {} };
    const f = obj as LegacyPendingFoldFile;
    if (!f.pending || typeof f.pending !== "object") f.pending = {};
    return f;
  } catch {
    return { pending: {} };
  }
}

/**
 * ONE-TIME forward migration of the legacy `<project>/second-brain/pending-fold.json`
 * queue file into manifest.json.foldedSessions. Called from BOTH the Stop hook (top of
 * its flow) and the pending-list read path (listPending, above) — migration triggers on
 * whichever runs first; running it again anywhere is a no-op (idempotent).
 *
 * Behavior:
 *   1. If the legacy file does not exist (including: already migrated — see step 4),
 *      this is a no-op.
 *   2. Otherwise, read its entries. For each legacy entry, fold it into
 *      manifest.json.foldedSessions[sessionId] as status:"pending" — but ONLY if no
 *      existing manifest record already supersedes it. PRECEDENCE (documented here,
 *      mirrored by markPending's own precedence rule): an existing "in-progress" or
 *      "governed-complete" record, or an OLD write-once legacy-shape record (no
 *      `status` field, back-compat treated as done), is NEVER clobbered — the legacy
 *      pending bookmark for that session is simply dropped (superseded). An existing
 *      "pending" record is refreshed with the legacy entry's fields (harmless, since
 *      both describe the same not-yet-folded state). An ABSENT record is created fresh
 *      as status:"pending".
 *   3. The manifest write happens under the SAME two-writer lock as every other
 *      manifest RMW in this module (withManifestLock over manifestPath(root)).
 *   4. Finally, rename the legacy file to "pending-fold.json.migrated" so a second
 *      call (from the other trigger point, or a retry) sees no legacy file and no-ops.
 *      The rename happens OUTSIDE the manifest lock (it is a distinct file), but AFTER
 *      the manifest write succeeds, so a crash between the two leaves the legacy file
 *      in place for a safe, idempotent re-migration (re-folding the same entries as
 *      status:"pending" a second time is harmless — precedence still applies).
 *
 * Idempotent: safe to call when the file doesn't exist, or when already renamed.
 */
export function migrateLegacyPendingFile(root: string): void {
  const legacyPath = pendingFoldPath(root);
  if (!fs.existsSync(legacyPath)) return;

  const legacy = readLegacyPendingFold(legacyPath);
  const entries = Object.values(legacy.pending);

  if (entries.length > 0) {
    const p = manifestPath(root);
    withManifestLock(p, () => {
      const manifest = readManifest(p);
      manifest.foldedSessions = manifest.foldedSessions ?? {};
      for (const e of entries) {
        if (!e || typeof e.sessionId !== "string") continue;
        const existing = manifest.foldedSessions[e.sessionId];
        if (existing && typeof existing === "object") {
          const rec = existing as Record<string, unknown>;
          const isPending = rec.status === "pending";
          if (!isPending) continue; // supersede rule: never clobber further-along/legacy-done
        }
        manifest.foldedSessions[e.sessionId] = {
          status:         "pending",
          sessionId:      e.sessionId,
          transcriptPath: e.transcriptPath,
          bookmarkedAt:   e.bookmarkedAt,
          runtime:        e.runtime,
        } satisfies PendingFoldMarker;
      }
      writeManifest(p, manifest);
    });
  }

  // Rename LAST (after the manifest write lands) so a crash mid-migration is
  // safely re-runnable: the legacy file stays present until its entries are
  // durably folded forward.
  try {
    fs.renameSync(legacyPath, migratedPendingFoldPath(root));
  } catch {
    /* best-effort — a concurrent migration may have already renamed it */
  }
}
