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

/** entries whose sessionId NOT in manifest.foldedSessions */
export function listPending(root: string): PendingFoldEntry[] {
  const f = readPendingFold(pendingFoldPath(root));
  const folded = readFoldedSessions(root);
  return Object.values(f.pending).filter((e) => !(e.sessionId in folded));
}
