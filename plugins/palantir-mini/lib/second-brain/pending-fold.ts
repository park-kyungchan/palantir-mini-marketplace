// @domain: LEARN
// Deterministic pending-fold bookmark for the model-driven second-brain fold.
// The Stop hook marks the just-ended session pending (NO LLM). The model-driven
// fold subagent clears it on a successful engine run. SessionStart reads it to
// decide whether to inject the fold-trigger additionalContext.
// Marker lives in <root>/second-brain/pending-fold.json — SEPARATE from the
// engine's manifest.json foldedSessions completion map (do not collide).
//
// AUTHORITY: manifest.json.foldedSessions remains the authoritative COMPLETION
// record (written by the engine in scripts/fold.ts AFTER a successful fold);
// pending-fold.json is ONLY a "needs attention" queue — a safety net, not a
// second source of truth. listPending() cross-checks foldedSessions and excludes
// any session already folded, so a transcript folded out-of-band (or by the
// engine's own idempotency) never re-triggers.

import * as fs from "fs";
import * as path from "path";

export interface PendingFoldEntry {
  sessionId:      string;
  transcriptPath: string;
  bookmarkedAt:   string;   // ISO
  runtime:        string;   // resolveHostRuntimeIdentity() at Stop time (advisory)
}

export interface PendingFoldFile {
  pending: Record<string, PendingFoldEntry>;
  [k: string]: unknown; // preserve unknown top-level keys (forward-compat)
}

/** join(root,"second-brain","pending-fold.json") */
export function pendingFoldPath(root: string): string {
  return path.join(root, "second-brain", "pending-fold.json");
}

/** best-effort; {pending:{}} on absent/invalid */
export function readPendingFold(p: string): PendingFoldFile {
  if (!fs.existsSync(p)) return { pending: {} };
  try {
    const raw = fs.readFileSync(p, "utf8");
    if (!raw.trim()) return { pending: {} };
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return { pending: {} };
    const f = obj as PendingFoldFile;
    if (!f.pending || typeof f.pending !== "object") f.pending = {};
    return f;
  } catch {
    return { pending: {} };
  }
}

/** atomic tmp+rename, preserve unknown keys */
export function writePendingFold(p: string, f: PendingFoldFile): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(f, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, p);
}

/** add+write; idempotent on sessionId */
export function markPending(root: string, e: PendingFoldEntry): void {
  const p = pendingFoldPath(root);
  const f = readPendingFold(p);
  f.pending[e.sessionId] = e;
  writePendingFold(p, f);
}

/** delete key+write; no-op if absent */
export function clearPending(root: string, sessionId: string): void {
  const p = pendingFoldPath(root);
  const f = readPendingFold(p);
  if (!(sessionId in f.pending)) return;
  delete f.pending[sessionId];
  writePendingFold(p, f);
}

/**
 * Read the engine's manifest.json.foldedSessions defensively (the SAME way
 * session-start.ts reads it). Returns the foldedSessions map or {} on any error.
 * UNCHANGED return shape (Record<string,unknown>) — the per-record "done" decision is
 * delegated to markerIsGovernedComplete() so the truth-table lives in ONE place.
 */
function readFoldedSessions(root: string): Record<string, unknown> {
  try {
    const manifestPath = path.join(root, "second-brain", "manifest.json");
    if (!fs.existsSync(manifestPath)) return {};
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      foldedSessions?: Record<string, unknown>;
    };
    return manifest.foldedSessions ?? {};
  } catch {
    return {};
  }
}

/**
 * The SOLE "done" definition, kept BYTE-IDENTICAL to the engine's
 * scripts/fold.ts markerIsGovernedComplete (one marker contract across both repos):
 *   - an OLD write-once marker (no `status` field) = present == done (back-compat): so the
 *     live 9910c7ea/1c0831f7 markers read as done and are excluded from the pending queue.
 *   - a lifecycle marker = done IFF status === "governed-complete".
 * An "in-progress" lifecycle record is NOT done → it STAYS pending and re-triggers (resume).
 * An absent record is trivially not-done → the session stays listed (the 122-backlog case).
 */
export function markerIsGovernedComplete(rec: unknown): boolean {
  if (!rec || typeof rec !== "object") return false;
  const r = rec as Record<string, unknown>;
  if (!("status" in r)) return true; // OLD write-once {foldedAt,nodeCount,edgeCount} = done
  return r.status === "governed-complete";
}

/**
 * Entries whose fold is NOT governed-complete (G2-A). Excludes only sessions whose marker
 * passes markerIsGovernedComplete — so an in-progress partial STAYS pending (re-triggers a
 * resume) and an old write-once marker stays excluded (back-compat). Replaces the bare
 * `sessionId in foldedSessions` membership test.
 */
export function listPending(root: string): PendingFoldEntry[] {
  const f = readPendingFold(pendingFoldPath(root));
  const folded = readFoldedSessions(root);
  return Object.values(f.pending).filter((e) => !markerIsGovernedComplete(folded[e.sessionId]));
}
