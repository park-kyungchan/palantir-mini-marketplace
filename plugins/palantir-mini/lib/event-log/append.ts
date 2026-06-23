/**
 * Atomic append via fs.mkdir mutex (zero-dep, NFS-safe)
 * @owner palantirkc-plugin-events
 * @purpose Atomic append via fs.mkdir mutex (zero-dep, NFS-safe)
 */
// palantir-mini v0 — Atomic append via fs.mkdir mutex (zero-dep, NFS-safe)
// Domain: ACTION (prim-action-03 AtomicCommit)
//
// Proven by prototype hyp-pm-A at 2x1000 events / 2 independent runs:
//   0 lost events, 0 duplicate sequences, 0 torn writes.
// (H-B snapshot-based lost 484/2000 = 24.2% — see kosmos/ontology-state/eval-results.json)
//
// fs.mkdirSync with recursive:false is atomic on all POSIX filesystems including NFS.
// EEXIST = another writer holds the lock. Retry with exponential backoff.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { EventEnvelope } from "./types";
import { assertWriteWithinDeclaredSet } from "../fs-atomic";

// Exported for v3.2.0 G3 events_log_rotate which needs the same lock to
// prevent torn rotation under concurrent writers.
export const LOCK_SUFFIX = ".lock";
const MAX_RETRIES = 30;
const BASE_DELAY  = 5;   // ms
const MAX_DELAY   = 250; // ms
const DEFAULT_STALE_LOCK_MS = 60_000;
const LOCK_OWNER_FILE = "owner.json";
const SEQUENCE_READ_CHUNK_BYTES = 64 * 1024;

interface LockOwnerMetadata {
  pid: number;
  hostname: string;
  createdAt: string;
  token: string;
}

export interface AcquireLockOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  staleLockMs?: number;
}

const heldLocks = new Map<string, string>();

export function lockPath(eventsPath: string): string {
  return eventsPath + LOCK_SUFFIX;
}

function lockOwnerPath(lockDir: string): string {
  return path.join(lockDir, LOCK_OWNER_FILE);
}

function createLockOwner(): LockOwnerMetadata {
  return {
    pid: process.pid,
    hostname: os.hostname(),
    createdAt: new Date().toISOString(),
    token: `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

function writeLockOwner(lockDir: string, owner: LockOwnerMetadata): void {
  fs.writeFileSync(lockOwnerPath(lockDir), JSON.stringify(owner, null, 2), "utf8");
  heldLocks.set(lockDir, owner.token);
}

function readLockOwner(lockDir: string): LockOwnerMetadata | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockOwnerPath(lockDir), "utf8")) as Partial<LockOwnerMetadata>;
    if (
      typeof parsed.pid === "number" &&
      Number.isInteger(parsed.pid) &&
      typeof parsed.hostname === "string" &&
      typeof parsed.createdAt === "string" &&
      typeof parsed.token === "string"
    ) {
      return parsed as LockOwnerMetadata;
    }
  } catch {
    // Legacy lock dirs did not carry owner metadata.
  }
  return null;
}

function linuxProcessState(pid: number): string | null {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const closeParen = stat.lastIndexOf(")");
    if (closeParen === -1) return null;
    const state = stat.slice(closeParen + 1).trim().split(/\s+/)[0];
    return state ?? null;
  } catch {
    return null;
  }
}

function processIsAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    const state = linuxProcessState(pid);
    if (state === "Z" || state === "X" || state === "x") return false;
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

function lockAgeMs(lockDir: string): number | null {
  try {
    const stat = fs.statSync(lockDir);
    return Date.now() - stat.mtimeMs;
  } catch {
    return null;
  }
}

function lockLooksStale(lockDir: string, staleLockMs: number): boolean {
  const owner = readLockOwner(lockDir);
  if (owner !== null && owner.hostname === os.hostname()) {
    return !processIsAlive(owner.pid);
  }

  const ageMs = lockAgeMs(lockDir);
  if (ageMs === null || ageMs < staleLockMs) return false;
  if (owner === null) return true;
  if (owner.hostname !== os.hostname()) return true;
  return !processIsAlive(owner.pid);
}

function recoverStaleLock(lockDir: string, staleLockMs: number): boolean {
  if (!lockLooksStale(lockDir, staleLockMs)) return false;

  const abandonedDir = `${lockDir}.stale-${process.pid}-${Date.now()}`;
  try {
    fs.renameSync(lockDir, abandonedDir);
    fs.rmSync(abandonedDir, { recursive: true, force: true });
    try {
      process.stderr.write(
        `[palantir-mini/event-log/append] recovered stale lock: ${lockDir}\n`,
      );
    } catch {
      // never throw from telemetry
    }
    return true;
  } catch {
    return false;
  }
}

function sequenceFromLines(lines: readonly string[]): number | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const raw = lines[i]!.trim();
    if (raw.length === 0) continue;
    // Fast-reject obvious non-JSON lines before touching JSON.parse.
    if (!raw.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(raw) as { sequence?: unknown };
      const seq = parsed.sequence;
      if (typeof seq === "number" && Number.isFinite(seq)) return seq;
    } catch {
      // Malformed JSON - skip, keep scanning backward.
    }
  }
  return null;
}

function readLastSequence(eventsPath: string): number {
  if (!fs.existsSync(eventsPath)) return 0;

  const stat = fs.statSync(eventsPath);
  if (stat.size === 0) return 0;

  const fd = fs.openSync(eventsPath, "r");
  try {
    let position = stat.size;
    let partialPrefix = "";

    while (position > 0) {
      const readSize = Math.min(SEQUENCE_READ_CHUNK_BYTES, position);
      position -= readSize;
      const buffer = Buffer.allocUnsafe(readSize);
      const bytesRead = fs.readSync(fd, buffer, 0, readSize, position);
      const chunk = buffer.subarray(0, bytesRead).toString("utf8");
      const lines = `${chunk}${partialPrefix}`.split("\n");
      const completeLines = position > 0 ? lines.slice(1) : lines;
      const seq = sequenceFromLines(completeLines);
      if (seq !== null) return seq;
      partialPrefix = position > 0 ? lines[0] ?? "" : "";
    }

    return 0;
  } finally {
    fs.closeSync(fd);
  }
}

export async function acquireLock(
  lockDir: string,
  options: AcquireLockOptions = {},
): Promise<void> {
  const startTime = Date.now();
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const baseDelay = options.baseDelayMs ?? BASE_DELAY;
  const maxDelay = options.maxDelayMs ?? MAX_DELAY;
  const staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
  let delay = baseDelay;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      fs.mkdirSync(lockDir);
      writeLockOwner(lockDir, createLockOwner());
      try {
        const holdTime = Date.now() - startTime;
        if (holdTime > 250) {
          process.stderr.write(
            `[palantir-mini/event-log/append] lock-hold telemetry: ${holdTime}ms exceeded 250ms threshold (lock=${lockDir})\n`
          );
        }
      } catch {
        // never throw from telemetry
      }
      return;
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "EEXIST") throw err;
      recoverStaleLock(lockDir, staleLockMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }
  throw new Error(`appendEventAtomic: failed to acquire lock after ${maxRetries} retries: ${lockDir}`);
}

export function releaseLock(lockDir: string): void {
  const heldToken = heldLocks.get(lockDir);
  try {
    if (heldToken !== undefined) {
      const owner = readLockOwner(lockDir);
      if (owner?.token !== heldToken) return;
      fs.rmSync(lockDir, { recursive: true, force: true });
      heldLocks.delete(lockDir);
      return;
    }
    fs.rmSync(lockDir, { recursive: true, force: true });
  } catch {
    // best-effort
  } finally {
    if (heldToken !== undefined) heldLocks.delete(lockDir);
  }
}

/**
 * Emits a single EventEnvelope to each project in the hierarchy, sequentially.
 * Each project's events.jsonl receives its own independent monotonic sequence.
 * Returns an array of sequence numbers in the same order as `projects`.
 *
 * Sequential loop (not Promise.all) — prevents interleaved writes across projects.
 * Best-effort per project: a failed write for one project does not abort the others;
 * its position in the result array receives -1 to signal failure.
 */
export async function emitToHierarchy(
  projects: string[],
  envelope: Omit<EventEnvelope, "sequence">
): Promise<number[]> {
  const results: number[] = [];
  for (const projectRoot of projects) {
    const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
    fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
    try {
      const seq = await appendEventAtomic(eventsPath, envelope);
      results.push(seq);
    } catch {
      results.push(-1);
    }
  }
  return results;
}

/**
 * Atomically appends an EventEnvelope as a single NDJSON line to eventsPath.
 * The sequence field is assigned under the lock — monotonic, no duplicates,
 * no lost events even under concurrent writers.
 */
export async function appendEventAtomic(
  eventsPath: string,
  envelope: Omit<EventEnvelope, "sequence">
): Promise<number> {
  // @Edits GOVERNED_EDIT_WRITE_SET — the ActionType-gated event write-back lands
  // inside the project's `.palantir-mini/` subtree; assert the actual target is a
  // subset (NON-BREAKING: warns unless PALANTIR_MINI_WRITE_SET_STRICT=1).
  assertWriteWithinDeclaredSet(eventsPath);
  const lockDir = lockPath(eventsPath);
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });

  await acquireLock(lockDir);
  try {
    // Scan from the tail for the last JSON line with a numeric `sequence`.
    // Normal appends read only the final chunk, while still walking backward
    // across corrupt trailing content when needed.
    const lastSequence = readLastSequence(eventsPath);

    const nextSequence = lastSequence + 1;
    const sealed: EventEnvelope = { ...envelope, sequence: nextSequence } as EventEnvelope;
    const line = JSON.stringify(sealed) + "\n";

    fs.appendFileSync(eventsPath, line, "utf8");

    return nextSequence;
  } finally {
    releaseLock(lockDir);
  }
}
