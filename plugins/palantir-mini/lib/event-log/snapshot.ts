/**
 * SnapshotManifest writer/reader
 * @owner palantirkc-plugin-events
 * @purpose SnapshotManifest writer/reader
 */
// palantir-mini v0 — SnapshotManifest writer/reader
// Domain: DATA (prim-data-04 SnapshotManifest)
//
// Snapshots are CACHE, not truth. events.jsonl is truth.
// A snapshot is a fold of the event log up to a sequence cut-point.

import * as fs from "fs";
import * as path from "path";
import { assertWriteWithinDeclaredSet } from "../fs-atomic";
import type { EventSnapshot, SnapshotManifest } from "./types";
import { readEvents } from "./read";
import { foldToSnapshot } from "./read";

export interface SnapshotEnvelope {
  manifest: SnapshotManifest;
  snapshot: EventSnapshot;
}

/**
 * Compute a snapshot from events.jsonl and write it to snapshotDir/{ontology.json,manifest.json}.
 */
export function writeSnapshot(
  eventsPath: string,
  snapshotDir: string,
  version = "0.1.0"
): SnapshotEnvelope {
  fs.mkdirSync(snapshotDir, { recursive: true });

  const events   = readEvents(eventsPath);
  const snapshot = foldToSnapshot(events);

  const manifest: SnapshotManifest = {
    version,
    atSequence:       snapshot.lastSequence,
    generatedAt:      new Date().toISOString(),
    sourceEventCount: snapshot.totalEvents,
  };

  // @Edits GOVERNED_EDIT_WRITE_SET — assert raw snapshot writes land inside
  // .palantir-mini/ (NON-BREAKING: warns unless PALANTIR_MINI_WRITE_SET_STRICT=1).
  const ontologyPath = path.join(snapshotDir, "ontology.json");
  const manifestDestPath = path.join(snapshotDir, "manifest.json");
  assertWriteWithinDeclaredSet(ontologyPath);
  fs.writeFileSync(ontologyPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  assertWriteWithinDeclaredSet(manifestDestPath);
  fs.writeFileSync(manifestDestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return { manifest, snapshot };
}

/**
 * Read a snapshot if it exists. Returns null if snapshot dir is empty.
 */
export function readSnapshot(snapshotDir: string): SnapshotEnvelope | null {
  const ontologyPath = path.join(snapshotDir, "ontology.json");
  const manifestPath = path.join(snapshotDir, "manifest.json");
  if (!fs.existsSync(ontologyPath) || !fs.existsSync(manifestPath)) return null;
  const snapshot = JSON.parse(fs.readFileSync(ontologyPath, "utf8")) as EventSnapshot;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SnapshotManifest;
  return { manifest, snapshot };
}

// ─── v3.2.0 — D2 PreCompact raw NDJSON snapshot + G4 retention ─────────────
//
// Distinct from writeSnapshot above: that helper computes a fold (manifest +
// ontology JSON) — derived. Rule 10 §PreCompact gate guarantees a RAW copy of
// events.jsonl so long sessions never lose events to corruption. v3.2.0 D2
// implements the missing raw-NDJSON path.

export interface RawSnapshotResult {
  path:       string;
  sizeBytes:  number;
  atSequence: number;
}

/**
 * Copy the live events.jsonl to <snapshotDir>/events-<ISO>.jsonl.
 * snapshotDir is created if missing. Returns the snapshot file path,
 * size in bytes, and the lastSequence read from the source.
 *
 * Caller is responsible for retention via pruneRawSnapshots.
 */
export function snapshotEventsRaw(eventsPath: string, snapshotDir: string): RawSnapshotResult {
  fs.mkdirSync(snapshotDir, { recursive: true });
  const stat = fs.statSync(eventsPath);
  const isoSafe = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(snapshotDir, `events-${isoSafe}.jsonl`);
  fs.copyFileSync(eventsPath, dest);

  // Best-effort read of last sequence — scan from end like appendEventAtomic.
  let atSequence = 0;
  try {
    const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    for (let i = lines.length - 1; i >= 0; i--) {
      const raw = lines[i]!;
      if (!raw.startsWith("{")) continue;
      try {
        const parsed = JSON.parse(raw) as { sequence?: unknown };
        if (typeof parsed.sequence === "number" && Number.isFinite(parsed.sequence)) {
          atSequence = parsed.sequence;
          break;
        }
      } catch { /* skip malformed */ }
    }
  } catch { /* best-effort */ }

  return { path: dest, sizeBytes: stat.size, atSequence };
}

export interface PruneOptions {
  /** Always keep at least N most-recent snapshots regardless of age. Default 20. */
  keepCount?: number;
  /** Keep all snapshots within this age in ms. Default 7 days. */
  maxAgeMs?:  number;
}

export interface PruneResult {
  keptCount:    number;
  removedCount: number;
  removedPaths: string[];
}

/**
 * Bound disk growth on the snapshots dir. Keep policy:
 *   keep = max(keepCount most-recent, all within maxAgeMs)
 *
 * The default policy keeps the larger of the two — generous for active
 * sessions, conservative for long-idle ones. Best-effort: unlink failures
 * do not throw (next prune retries).
 */
export function pruneRawSnapshots(snapshotDir: string, opts: PruneOptions = {}): PruneResult {
  const keepCount = opts.keepCount ?? 20;
  const maxAgeMs  = opts.maxAgeMs  ?? 7 * 24 * 3600 * 1000;
  const result: PruneResult = { keptCount: 0, removedCount: 0, removedPaths: [] };

  if (!fs.existsSync(snapshotDir)) return result;

  let entries: { path: string; mtimeMs: number }[];
  try {
    entries = fs.readdirSync(snapshotDir)
      .filter((f) => f.startsWith("events-") && f.endsWith(".jsonl"))
      .map((f) => {
        const full = path.join(snapshotDir, f);
        const stat = fs.statSync(full);
        return { path: full, mtimeMs: stat.mtimeMs };
      });
  } catch {
    return result;
  }

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const cutoffMs = Date.now() - maxAgeMs;
  const keepIndices = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (i < keepCount || e.mtimeMs >= cutoffMs) keepIndices.add(i);
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (keepIndices.has(i)) {
      result.keptCount++;
      continue;
    }
    try {
      fs.unlinkSync(e.path);
      result.removedCount++;
      result.removedPaths.push(e.path);
    } catch { /* best-effort */ }
  }

  return result;
}
