/**
 * palantir-mini v3.2.0 — Events log rotation (G3)
 * @owner palantirkc-plugin-events
 * @purpose Rename a breached events.jsonl → archive/events-rotated-<ISO>.jsonl
 *          atomically, under the same .lock that appendEventAtomic uses, so
 *          concurrent writers can't tear the rotation. Preserves rule 10
 *          append-only invariant: the rename does not modify content; the
 *          fresh events.jsonl can be created inside the same lock when callers
 *          provide a bridge event.
 *
 * Threshold defaults: 10 MB OR 10K lines. Either trigger rotates.
 *
 * Readers (replay-lineage / pm-retro-query / pm-recap) auto-merge archive/*.jsonl
 * via lib/event-log/read.ts:readEvents — so rotation is transparent to consumers.
 */

import * as fs from "fs";
import * as path from "path";
import { acquireLock, lockPath, releaseLock } from "./append";
import { assertWriteWithinDeclaredSet } from "../fs-atomic";
import type { EventEnvelope } from "./types";

export interface RotationEventInfo {
  archivedPath:    string;
  eventsPath:      string;
  sizeBytes:       number;
  lineCount:       number;
  thresholdBytes:  number;
  thresholdLines:  number;
  lastSequence:    number;
}

export interface RotateOptions {
  /** Bytes threshold; default 10 MB. */
  thresholdBytes?: number;
  /** Line-count threshold; default 10000. */
  thresholdLines?: number;
  /**
   * Optional bridge event builder. When present, rotation writes the returned
   * event into the fresh live log with sequence `last archived sequence + 1`
   * before releasing the rotation lock.
   */
  rotationEvent?: (info: RotationEventInfo) => Omit<EventEnvelope, "sequence">;
}

export interface RotateResult {
  rotated:        boolean;
  archivedPath?:  string;
  sizeBytes:      number;
  lineCount:      number;
  thresholdBytes: number;
  thresholdLines: number;
  eventsPath?:    string;
  lastSequence?:  number;
  rotationEventSequence?: number;
}

const DEFAULT_BYTES = 10 * 1024 * 1024;
const DEFAULT_LINES = 10_000;

function countLines(filePath: string): number {
  try {
    return fs.readFileSync(filePath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .length;
  } catch {
    return 0;
  }
}

function readLastSequence(filePath: string): number {
  try {
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const raw = lines[i]!.trim();
      if (raw.length === 0 || !raw.startsWith("{")) continue;
      try {
        const parsed = JSON.parse(raw) as { sequence?: unknown };
        if (typeof parsed.sequence === "number" && Number.isFinite(parsed.sequence)) {
          return parsed.sequence;
        }
      } catch {
        // Skip malformed trailing rows; quarantine belongs to readEvents.
      }
    }
  } catch {
    // Missing/unreadable events log behaves like an empty log.
  }
  return 0;
}

/**
 * Rotate the project's events.jsonl when it exceeds either threshold.
 * Returns { rotated: false } if file missing OR under both thresholds.
 *
 * Atomicity: acquires events.jsonl.lock (same as appendEventAtomic), so any
 * concurrent emit waits behind the rotation. If `rotationEvent` is supplied,
 * a fresh events.jsonl is written under the same lock and starts at
 * last archived sequence + 1, preserving replay order across archive + live.
 * Without `rotationEvent`, legacy behavior is preserved: the next emit creates
 * the fresh events.jsonl lazily.
 */
export async function rotateEventLog(
  projectRoot: string,
  opts: RotateOptions = {},
): Promise<RotateResult> {
  const sessionDir = path.join(projectRoot, ".palantir-mini", "session");
  const eventsPath = path.join(sessionDir, "events.jsonl");
  const archiveDir = path.join(sessionDir, "archive");
  const thresholdBytes = opts.thresholdBytes ?? DEFAULT_BYTES;
  const thresholdLines = opts.thresholdLines ?? DEFAULT_LINES;

  if (!fs.existsSync(eventsPath)) {
    return { rotated: false, sizeBytes: 0, lineCount: 0, thresholdBytes, thresholdLines };
  }

  const stat = fs.statSync(eventsPath);
  const sizeBytes = stat.size;
  const lineCount = countLines(eventsPath);

  if (sizeBytes < thresholdBytes && lineCount < thresholdLines) {
    return { rotated: false, sizeBytes, lineCount, thresholdBytes, thresholdLines };
  }

  fs.mkdirSync(archiveDir, { recursive: true });
  const isoSafe = new Date().toISOString().replace(/[:.]/g, "-");
  const archivedPath = path.join(archiveDir, `events-rotated-${isoSafe}.jsonl`);

  const lockDir = lockPath(eventsPath);
  await acquireLock(lockDir);
  try {
    // Re-check after acquiring lock — concurrent writer may have rotated already.
    if (!fs.existsSync(eventsPath)) {
      return { rotated: false, sizeBytes: 0, lineCount: 0, thresholdBytes, thresholdLines };
    }

    const lockedStat = fs.statSync(eventsPath);
    const lockedSizeBytes = lockedStat.size;
    const lockedLineCount = countLines(eventsPath);

    if (lockedSizeBytes < thresholdBytes && lockedLineCount < thresholdLines) {
      return {
        rotated: false,
        sizeBytes: lockedSizeBytes,
        lineCount: lockedLineCount,
        thresholdBytes,
        thresholdLines,
      };
    }

    const lastSequence = readLastSequence(eventsPath);
    // @Edits GOVERNED_EDIT_WRITE_SET — assert the rename TARGET (archive) lands
    // inside .palantir-mini/ (NON-BREAKING: warns unless PALANTIR_MINI_WRITE_SET_STRICT=1).
    assertWriteWithinDeclaredSet(archivedPath);
    fs.renameSync(eventsPath, archivedPath);

    let rotationEventSequence: number | undefined;
    const rotationEvent = opts.rotationEvent?.({
      archivedPath,
      eventsPath,
      sizeBytes: lockedSizeBytes,
      lineCount: lockedLineCount,
      thresholdBytes,
      thresholdLines,
      lastSequence,
    });
    if (rotationEvent !== undefined) {
      rotationEventSequence = lastSequence + 1;
      const sequencedEvent: EventEnvelope = {
        ...rotationEvent,
        sequence: rotationEventSequence,
      } as EventEnvelope;
      assertWriteWithinDeclaredSet(eventsPath);
      fs.writeFileSync(eventsPath, `${JSON.stringify(sequencedEvent)}\n`, "utf8");
    }

    return {
      rotated: true,
      archivedPath,
      sizeBytes: lockedSizeBytes,
      lineCount: lockedLineCount,
      thresholdBytes,
      thresholdLines,
      eventsPath,
      lastSequence,
      ...(rotationEventSequence !== undefined ? { rotationEventSequence } : {}),
    };
  } finally {
    releaseLock(lockDir);
  }
}
