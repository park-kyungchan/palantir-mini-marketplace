#!/usr/bin/env bun
// palantir-mini v4.11.0 — archive-t0-events.ts (rule 26 §Substrate routing)
//
// Batch script: reads <projectRoot>/.palantir-mini/session/events.jsonl,
// filters events with valueGrade === "T0" AND when older than 7 days,
// appends them to the T0 archive file, then emits events_rotated to a
// new canonical events.jsonl (atomic rename per rule 10 §Substrate invariant).
//
// Usage:
//   bun run archive-t0-events.ts [--project <projectRoot>] [--age-days <N>] [--dry-run]
//
// Authority: rule 26 §Substrate routing ("T0 → archive 7d 후 삭제")
//            rule 10 §Canonical scope (rotation = atomic rename, not in-place rewrite)
//
// Idempotent: re-running on already-archived events is a no-op (T0 rows
// won't exist in canonical events.jsonl after first successful run; archive
// file gets no duplicate appends due to eventId dedup check).

import * as fs from "fs";
import * as path from "path";
import { appendEventAtomic } from "../lib/event-log/append";
import { emit } from "./log";

// ─── CLI arg parsing ────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  projectRoot: string;
  ageDays: number;
  dryRun: boolean;
} {
  let projectRoot = process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  let ageDays = 7;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) {
      projectRoot = argv[++i]!;
    } else if (argv[i] === "--age-days" && argv[i + 1]) {
      ageDays = parseInt(argv[++i]!, 10);
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { projectRoot, ageDays, dryRun };
}

// ─── Path helpers ───────────────────────────────────────────────────────────

export function eventsJsonlPath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
}

export function archiveDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "archive");
}

export function t0ArchiveFilePath(projectRoot: string, date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const dd   = String(date.getDate()).padStart(2, "0");
  return path.join(archiveDir(projectRoot), `T0-${yyyy}-${mm}-${dd}.jsonl`);
}

// ─── Archive age predicate ──────────────────────────────────────────────────

export function isOlderThan(when: string, ageDays: number, now: Date = new Date()): boolean {
  const eventDate = new Date(when);
  if (isNaN(eventDate.getTime())) return false;
  const cutoff = new Date(now.getTime() - ageDays * 24 * 60 * 60 * 1000);
  return eventDate < cutoff;
}

// ─── Read all eventIds already in archive file (idempotency) ───────────────

export function readArchivedEventIds(archiveFilePath: string): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(archiveFilePath)) return ids;
  const content = fs.readFileSync(archiveFilePath, "utf8");
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as { eventId?: unknown };
      if (typeof obj.eventId === "string") ids.add(obj.eventId);
    } catch { /* skip malformed */ }
  }
  return ids;
}

// ─── Core logic (exported for testability) ──────────────────────────────────

export interface ArchiveResult {
  archivedCount:   number;
  archiveFile:     string;
  keptCount:       number;
  skippedDuplicate: number;
  dryRun:          boolean;
}

export async function archiveT0Events(opts: {
  projectRoot: string;
  ageDays?: number;
  dryRun?: boolean;
  now?: Date;
}): Promise<ArchiveResult> {
  const { projectRoot, ageDays = 7, dryRun = false, now = new Date() } = opts;

  const eventsPath   = eventsJsonlPath(projectRoot);
  const archivePath  = t0ArchiveFilePath(projectRoot, now);

  if (!fs.existsSync(eventsPath)) {
    return { archivedCount: 0, archiveFile: archivePath, keptCount: 0, skippedDuplicate: 0, dryRun };
  }

  const content = fs.readFileSync(eventsPath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  const toArchive: string[]  = [];
  const toKeep:    string[]  = [];
  let skippedDuplicate = 0;

  const alreadyArchived = readArchivedEventIds(archivePath);

  for (const line of lines) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // Keep malformed lines in canonical file (append-only invariant; never lose data)
      toKeep.push(line);
      continue;
    }

    const grade = parsed.valueGrade as string | undefined;
    const when  = parsed.when  as string | undefined;
    const eventId = parsed.eventId as string | undefined;

    if (grade === "T0" && when && isOlderThan(when, ageDays, now)) {
      // Idempotency: skip if already in archive
      if (eventId && alreadyArchived.has(eventId)) {
        skippedDuplicate++;
        // Still keep out of canonical (it was archived before; should not be in canonical)
        // Don't re-append to archive
        continue;
      }
      toArchive.push(line);
    } else {
      toKeep.push(line);
    }
  }

  if (toArchive.length === 0) {
    return { archivedCount: 0, archiveFile: archivePath, keptCount: toKeep.length, skippedDuplicate, dryRun };
  }

  if (!dryRun) {
    // Ensure archive directory exists
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });

    // Append T0 rows to archive file (append-only per rule 10)
    const archiveChunk = toArchive.join("\n") + "\n";
    fs.appendFileSync(archivePath, archiveChunk, "utf8");

    // Rotate canonical events.jsonl via atomic rename (per rule 10 §Canonical scope)
    // 1. Write new canonical file to a temp path alongside the original
    // 2. Atomic rename over original
    const tmpPath = eventsPath + ".tmp-rotate";
    fs.writeFileSync(tmpPath, toKeep.join("\n") + (toKeep.length > 0 ? "\n" : ""), "utf8");
    fs.renameSync(tmpPath, eventsPath);

    // Emit validation_phase_completed errorClass="t0_archived" to record the rotation
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase:        "design",
        passed:       true,
        errorClass:   "t0_archived",
        archivedCount: toArchive.length,
        archiveFile:  archivePath,
        keptCount:    toKeep.length,
        skippedDuplicate,
      } as Record<string, unknown>,
      toolName:  "archive-t0-events",
      cwd:       projectRoot,
      identity:  "monitor",
      memoryLayers: ["procedural"],
      reasoning: `archive-t0-events: rotated ${toArchive.length} T0 events older than ${ageDays}d to ${path.basename(archivePath)}`,
    });
  }

  return {
    archivedCount:   toArchive.length,
    archiveFile:     archivePath,
    keptCount:       toKeep.length,
    skippedDuplicate,
    dryRun,
  };
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await archiveT0Events(args);

  if (args.dryRun) {
    console.log(`[DRY RUN] Would archive ${result.archivedCount} T0 events → ${result.archiveFile}`);
    console.log(`[DRY RUN] Would keep ${result.keptCount} events in canonical events.jsonl`);
    if (result.skippedDuplicate > 0) {
      console.log(`[DRY RUN] Already archived (skipped): ${result.skippedDuplicate}`);
    }
  } else {
    if (result.archivedCount === 0) {
      console.log(`archive-t0-events: no eligible T0 events found (age > ${args.ageDays}d)`);
    } else {
      console.log(`archive-t0-events: archived ${result.archivedCount} T0 events → ${result.archiveFile}`);
      console.log(`archive-t0-events: ${result.keptCount} events remain in canonical events.jsonl`);
    }
    if (result.skippedDuplicate > 0) {
      console.log(`archive-t0-events: skipped ${result.skippedDuplicate} already-archived events (idempotent)`);
    }
  }
}

main().catch((err) => {
  process.stderr.write(`archive-t0-events: FATAL: ${String(err)}\n`);
  process.exit(1);
});
