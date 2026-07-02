// @domain: LEARN
// foldedsessions-retention-cli — compaction CLI for the second-brain fold marker
// retention policy (W3 workstream D). Thin I/O shell around the PURE
// lib/second-brain/retention.ts planRetention(): read manifest.json -> plan ->
// APPEND pruned markers to <root>/second-brain/manifest-archive.jsonl (append-only,
// one JSON object per line) -> remove them from manifest.json.foldedSessions -> write,
// all under the SAME two-writer manifest lock foldedsessions-bump-cli.ts uses.
//
// NEVER SILENTLY DELETES: every compaction is an ARCHIVE-APPEND FIRST, then removal
// from the live manifest — so a crash between the two leaves the archive with a
// (possibly duplicate, harmless) row and the live manifest UNCHANGED, never the other
// way around (never removed-without-archived).
//
// GRAPH.JSON CONTENT PRUNING IS OUT OF SCOPE (engine-side, out-of-repo) — this CLI only
// ever touches manifest.json.foldedSessions marker records, never graph.json.
//
// Usage:
//   bun run lib/second-brain/foldedsessions-retention-cli.ts plan    <root> [--live-days N] [--max-entries N]
//     Dry-run: prints the RetentionPlan as JSON, mutates NOTHING.
//   bun run lib/second-brain/foldedsessions-retention-cli.ts compact <root> [--live-days N] [--max-entries N]
//     Executes the plan: archive-append then live-manifest removal, under the lock.
// Exit 0 on success (including a no-op plan/compact); nonzero + stderr on a hard failure
// (e.g. archive write failure) — in that case the live manifest is left UNCHANGED.

import * as fs from "fs";
import * as path from "path";
import { manifestPath, withManifestLock } from "./foldedsessions-bump-cli";
import {
  planRetention,
  DEFAULT_FOLD_RETENTION_POLICY,
  type RetentionPolicy,
  type RetentionManifestInput,
  type RetentionPlan,
} from "./retention";

interface Manifest {
  foldedSessions?: Record<string, unknown>;
  [k: string]: unknown;
}

/** join(root,"second-brain","manifest-archive.jsonl") */
export function manifestArchivePath(root: string): string {
  return path.join(root, "second-brain", "manifest-archive.jsonl");
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
 * Append-only archive write: ONE JSON object per line, appended (never truncates/rewrites
 * prior lines). Archive row shape: { sessionId, marker, reason, archivedAt }.
 */
function appendToArchive(root: string, rows: ReadonlyArray<{ sessionId: string; marker: unknown; reason: string }>): void {
  if (rows.length === 0) return;
  const p = manifestArchivePath(root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const archivedAt = new Date().toISOString();
  const lines = rows.map((r) => JSON.stringify({ ...r, archivedAt }) + "\n").join("");
  fs.appendFileSync(p, lines, "utf8");
}

export interface CompactResult {
  changed: boolean;
  compactedCount: number;
  retainedCount: number;
  archivePath: string;
}

/**
 * Execute ONE retention compaction pass under the manifest lock: plan -> archive-append
 * -> live-manifest removal -> write. Idempotent-safe to re-run (a session already
 * archived+removed simply won't appear in the next plan).
 */
export function compactFoldedSessions(root: string, policy: RetentionPolicy = DEFAULT_FOLD_RETENTION_POLICY): CompactResult {
  const p = manifestPath(root);
  return withManifestLock(p, () => {
    const manifest = readManifest(p);
    const input: RetentionManifestInput = {
      foldedSessions: (manifest.foldedSessions ?? {}) as Record<string, Record<string, unknown>>,
    };
    const plan = planRetention(input, policy);

    if (plan.compactable.length === 0) {
      return {
        changed: false,
        compactedCount: 0,
        retainedCount: plan.retained.length,
        archivePath: manifestArchivePath(root),
      };
    }

    // ARCHIVE-APPEND FIRST (never silently delete) — if this throws, the live manifest
    // below is NEVER touched (the function returns/throws before reaching writeManifest).
    appendToArchive(
      root,
      plan.compactable.map((c) => ({ sessionId: c.sessionId, marker: c.marker, reason: c.reason })),
    );

    // Only AFTER the archive append durably lands do we remove from the live manifest.
    const folded = manifest.foldedSessions ?? {};
    for (const c of plan.compactable) {
      delete folded[c.sessionId];
    }
    manifest.foldedSessions = folded;
    writeManifest(p, manifest);

    return {
      changed: true,
      compactedCount: plan.compactable.length,
      retainedCount: plan.retained.length,
      archivePath: manifestArchivePath(root),
    };
  });
}

/** Dry-run: compute the plan without mutating anything. */
export function planFoldedSessionsRetention(
  root: string,
  policy: RetentionPolicy = DEFAULT_FOLD_RETENTION_POLICY,
): RetentionPlan {
  const p = manifestPath(root);
  const manifest = readManifest(p);
  return planRetention(
    { foldedSessions: (manifest.foldedSessions ?? {}) as Record<string, Record<string, unknown>> },
    policy,
  );
}

function parsePolicyArgs(argv: string[]): RetentionPolicy {
  let liveDays = DEFAULT_FOLD_RETENTION_POLICY.liveDays;
  let maxLiveEntries = DEFAULT_FOLD_RETENTION_POLICY.maxLiveEntries;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--live-days" && argv[i + 1] !== undefined) {
      const n = Number(argv[i + 1]);
      if (!Number.isNaN(n)) liveDays = n;
    }
    if (argv[i] === "--max-entries" && argv[i + 1] !== undefined) {
      const n = Number(argv[i + 1]);
      if (!Number.isNaN(n)) maxLiveEntries = n;
    }
  }
  return { liveDays, maxLiveEntries, reason: DEFAULT_FOLD_RETENTION_POLICY.reason };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const [cmd, root] = argv;
  try {
    if (cmd === "plan" && root) {
      const policy = parsePolicyArgs(argv.slice(2));
      const plan = planFoldedSessionsRetention(root, policy);
      process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
      process.exit(0);
    } else if (cmd === "compact" && root) {
      const policy = parsePolicyArgs(argv.slice(2));
      const result = compactFoldedSessions(root, policy);
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      process.exit(0);
    } else {
      process.stderr.write(
        "usage: foldedsessions-retention-cli.ts plan|compact <root> [--live-days N] [--max-entries N]\n",
      );
      process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`foldedsessions-retention-cli: ${(e as Error).message}\n`);
    process.exit(1);
  }
}
