/**
 * Concrete fs sink for bounded-return overflow — the injected wiring boundary.
 *
 * Lifted VERBATIM out of `bridge/mcp-server.ts` (signatures unchanged) so the MCP
 * seam AND the pm_semantic_intent_gate handler import ONE implementation instead of
 * two divergent copies. The pure compute lib (`lib/bounded-return`) never touches fs;
 * these two functions are the only fs-touching part of the overflow machinery.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";
import type { BoundedReturnSink, BoundedReturnSinkPort } from "./index";

// ── Overflow-dir age-out GC ──────────────────────────────────────────────────
// Lazy, fail-open, best-effort cleanup so the overflow cache cannot grow unbounded.
// Runs INSIDE the shared write chokepoint (both the MCP seam and the gate handler
// inherit it). NEVER throws from the sink; deletes ONLY overflow files this sink wrote.
const GC_SENTINEL = ".last-gc";
// <toolName>-<ISO stamp with :. -> ->-<sha256[:8]>.json (see makeOverflowFileSink below).
const OVERFLOW_NAME_RE = /^[A-Za-z0-9_]+-\d{4}-\d{2}-\d{2}T[\d-]+Z-[0-9a-f]{8}\.json$/;

function posIntEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const GC_MIN_INTERVAL_MS = posIntEnv("PALANTIR_MINI_OVERFLOW_GC_MIN_INTERVAL_MS", 6 * 60 * 60 * 1000); // 6h
const GC_MAX_AGE_MS = posIntEnv("PALANTIR_MINI_OVERFLOW_GC_MAX_AGE_MS", 7 * 24 * 60 * 60 * 1000); // 7d
const GC_MAX_FILES = posIntEnv("PALANTIR_MINI_OVERFLOW_GC_MAX_FILES", 500);
const GC_DISABLED = process.env.PALANTIR_MINI_OVERFLOW_GC_DISABLE === "1";

/**
 * Age-out GC for the overflow dir. Best-effort, fail-OPEN, non-recursive, exact-dir only.
 * Deletes ONLY files matching the overflow filename pattern; never the sentinel, subdirs,
 * symlinks, or hand-dropped files. Primary policy = mtime age; backstop = count cap
 * (oldest-by-mtime first). Exported so the unit test can drive it without waiting 7 days.
 */
export function sweepOverflowDir(
  root: string,
  opts?: { maxAgeMs?: number; maxFiles?: number; now?: number },
): void {
  const maxAgeMs = opts?.maxAgeMs ?? GC_MAX_AGE_MS;
  const maxFiles = opts?.maxFiles ?? GC_MAX_FILES;
  const now = opts?.now ?? Date.now();
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    const matched: Array<{ name: string; mtimeMs: number }> = [];
    for (const e of entries) {
      if (!e.isFile()) continue; // skips subdirs and symlink-to-dir
      if (!OVERFLOW_NAME_RE.test(e.name)) continue; // never the sentinel / hand-dropped files
      const full = path.join(root, e.name);
      try {
        const st = fs.lstatSync(full);
        if (st.isSymbolicLink() || !st.isFile()) continue; // never follow / delete symlinks
        matched.push({ name: e.name, mtimeMs: st.mtimeMs });
      } catch {
        /* vanished mid-scan — ignore */
      }
    }
    // Primary: age-out.
    const survivors: Array<{ name: string; mtimeMs: number }> = [];
    for (const f of matched) {
      if (f.mtimeMs < now - maxAgeMs) {
        try {
          fs.unlinkSync(path.join(root, f.name));
        } catch {
          /* concurrent sweep / ENOENT — ignore */
        }
      } else {
        survivors.push(f);
      }
    }
    // Backstop: count cap — delete oldest-by-mtime down to the cap (newest N always retained).
    if (survivors.length > maxFiles) {
      survivors.sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first
      for (const f of survivors.slice(0, survivors.length - maxFiles)) {
        try {
          fs.unlinkSync(path.join(root, f.name));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* readdir failed (missing dir / perms) — GC is best-effort; swallow */
  }
}

/** Sentinel-throttled wrapper: scan at most once per GC_MIN_INTERVAL_MS across all writers. */
export function maybeSweepOverflowDir(root: string): void {
  if (GC_DISABLED) return;
  const sentinel = path.join(root, GC_SENTINEL);
  try {
    const st = fs.statSync(sentinel);
    if (Date.now() - st.mtimeMs < GC_MIN_INTERVAL_MS) return; // not due — no readdir
  } catch {
    /* missing/unreadable sentinel — treat as due */
  }
  // Touch the sentinel FIRST so concurrent writers don't all scan, THEN sweep.
  try {
    fs.writeFileSync(sentinel, "");
  } catch {
    /* if we can't write the sentinel we still sweep once; swallow */
  }
  sweepOverflowDir(root);
}

/** Resolve the directory tree to write an overflow file under. */
export function resolveOverflowRoot(args: Record<string, unknown>): string {
  const candidate = args.projectRoot ?? args.project;
  if (typeof candidate === "string" && candidate.length > 0) {
    return path.join(candidate, ".palantir-mini", "mcp-response-overflow");
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-mcp-overflow-"));
}

/** Concrete fs sink — writes the serialized oversized full result to a unique file. */
export function makeOverflowFileSink(toolName: string, root: string): BoundedReturnSinkPort {
  return {
    write(serialized: string): BoundedReturnSink {
      fs.mkdirSync(root, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const shortHash = createHash("sha256").update(serialized).digest("hex").slice(0, 8);
      const file = path.join(root, `${toolName}-${stamp}-${shortHash}.json`);
      fs.writeFileSync(file, serialized);
      const out = { path: file, bytes: Buffer.byteLength(serialized, "utf8") };
      // Best-effort age-out GC AFTER the write (the just-written file has a fresh mtime,
      // so it is never its own victim). A GC failure must NEVER break a sink write.
      try {
        maybeSweepOverflowDir(root);
      } catch {
        /* the file is already written; swallow any GC error */
      }
      return out;
    },
  };
}
