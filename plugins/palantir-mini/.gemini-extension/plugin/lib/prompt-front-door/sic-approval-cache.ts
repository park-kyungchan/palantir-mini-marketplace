/**
 * palantir-mini v6.30.0 — SIC Approval Cache
 * @owner palantirkc-plugin-prompt-front-door
 * @purpose 60-min SIC approval cache for prompt-dtc-enforcement-gate selective-blocking mode.
 *
 * Cache sources (in priority order):
 *   1. In-memory (per process invocation, fastest)
 *   2. .palantir-mini/session/sic-approval-cache.json (persisted, survives hook re-invocations)
 *   3. events.jsonl (semantic_intent_contract_approved events, last 60 min)
 *
 * A "cache hit" means: a SemanticIntentContract was approved within the last 60 min
 * for a scope/promptId matching the current tool call. Cache misses require full gate evaluation.
 *
 * Per canonical plan v2 §4 row 5.11; PR 5.11 (sprint-122).
 */

import * as fs from "node:fs";
import * as path from "node:path";

export const SIC_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

export interface SicApprovalEntry {
  readonly promptId: string;
  readonly approvedAt: string; // ISO8601
  readonly approvalRef?: string;
  readonly projectRoot?: string;
  /** ISO8601 timestamp of DTC approval (absent if DTC not yet approved). */
  readonly dtcApprovedAt?: string;
  /** Number of DTC fill turns completed at time of DTC approval (0-7). */
  readonly dtcFillTurnsCompleted?: number;
  /** Last DTC rubric overall score 0-1 at time of approval. */
  readonly lastApprovedRubricScore?: number;
}

/**
 * DTC-focused approval entry, derived from a SicApprovalEntry that has been
 * DTC-approved. Carries the DTC approval fields plus projectRoot/promptId for
 * unambiguous identification, and a computed age_ms.
 */
export interface DtcApprovalEntry {
  readonly projectRoot: string;
  readonly promptId: string;
  readonly dtcApprovedAt: string;
  readonly dtcFillTurnsCompleted: number;
  readonly lastApprovedRubricScore: number;
  readonly age_ms: number;
}

export interface SicApprovalCache {
  readonly entries: SicApprovalEntry[];
  readonly updatedAt: string;
}

// In-memory cache keyed by projectRoot
const memoryCache = new Map<string, SicApprovalCache>();

function cacheFilePath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "sic-approval-cache.json");
}

function isEntryFresh(entry: SicApprovalEntry, nowMs: number): boolean {
  const approvedMs = new Date(entry.approvedAt).getTime();
  return nowMs - approvedMs <= SIC_CACHE_TTL_MS;
}

/**
 * Read cache from disk (best-effort; returns empty cache on any error).
 */
function readDiskCache(projectRoot: string): SicApprovalCache {
  try {
    const filePath = cacheFilePath(projectRoot);
    if (!fs.existsSync(filePath)) return { entries: [], updatedAt: new Date().toISOString() };
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as SicApprovalCache;
    if (!Array.isArray(parsed.entries)) return { entries: [], updatedAt: new Date().toISOString() };
    return parsed;
  } catch {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
}

/**
 * Write cache to disk (best-effort; ignores write errors).
 */
function writeDiskCache(projectRoot: string, cache: SicApprovalCache): void {
  try {
    const filePath = cacheFilePath(projectRoot);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cache, null, 2) + "\n", "utf8");
  } catch {
    // best-effort only
  }
}

/**
 * Scan events.jsonl for recent semantic_intent_contract_approved events.
 * Returns entries from the last 60 min.
 */
function readApprovedEntriesFromEvents(projectRoot: string, nowMs: number): SicApprovalEntry[] {
  try {
    const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
    if (!fs.existsSync(eventsPath)) return [];
    const content = fs.readFileSync(eventsPath, "utf8");
    const entries: SicApprovalEntry[] = [];
    for (const line of content.split("\n")) {
      if (line.trim().length === 0) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (event.type !== "semantic_intent_contract_approved") continue;
      const when = typeof event.when === "string" ? event.when : undefined;
      if (!when) continue;
      const eventMs = new Date(when).getTime();
      if (nowMs - eventMs > SIC_CACHE_TTL_MS) continue;

      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const promptId = typeof payload.promptId === "string" ? payload.promptId : undefined;
      const approvalRef = typeof payload.approvalRef === "string" ? payload.approvalRef : undefined;
      entries.push({
        promptId: promptId ?? "unknown",
        approvedAt: when,
        approvalRef,
        projectRoot,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Check if there is a valid SIC approval within the last 60 min for this project/promptId.
 * Returns the matching entry if found, undefined if cache miss or expired.
 *
 * @param projectRoot - project root (used as cache scope key)
 * @param promptId    - optional: if provided, must match; if absent, any fresh entry qualifies
 */
export function checkSicApprovalCache(
  projectRoot: string,
  promptId?: string,
): SicApprovalEntry | undefined {
  const nowMs = Date.now();

  // 1. Check in-memory first
  const memEntry = memoryCache.get(projectRoot);
  if (memEntry) {
    const match = memEntry.entries.find(
      (e) =>
        isEntryFresh(e, nowMs) &&
        (promptId == null || e.promptId === promptId || e.promptId === "unknown"),
    );
    if (match) return match;
  }

  // 2. Check disk cache
  const diskCache = readDiskCache(projectRoot);
  const diskMatch = diskCache.entries.find(
    (e) =>
      isEntryFresh(e, nowMs) &&
      (promptId == null || e.promptId === promptId || e.promptId === "unknown"),
  );
  if (diskMatch) {
    // Populate memory cache
    memoryCache.set(projectRoot, diskCache);
    return diskMatch;
  }

  // 3. Scan events.jsonl
  const eventEntries = readApprovedEntriesFromEvents(projectRoot, nowMs);
  const eventMatch = eventEntries.find(
    (e) =>
      isEntryFresh(e, nowMs) &&
      (promptId == null || e.promptId === promptId || e.promptId === "unknown"),
  );
  if (eventMatch) {
    // Promote to disk + memory cache
    const merged: SicApprovalCache = {
      entries: [...diskCache.entries, ...eventEntries].filter((e) => isEntryFresh(e, nowMs)),
      updatedAt: new Date().toISOString(),
    };
    writeDiskCache(projectRoot, merged);
    memoryCache.set(projectRoot, merged);
    return eventMatch;
  }

  return undefined;
}

/**
 * Record a new SIC approval in the cache (in-memory + disk).
 * Called when a semantic_intent_contract_approved event is observed or a gate pass is confirmed.
 */
export function recordSicApproval(
  projectRoot: string,
  promptId: string,
  approvalRef?: string,
): void {
  const entry: SicApprovalEntry = {
    promptId,
    approvedAt: new Date().toISOString(),
    approvalRef,
    projectRoot,
  };
  const nowMs = Date.now();
  const existing = readDiskCache(projectRoot);
  const freshExisting = existing.entries.filter((e) => isEntryFresh(e, nowMs));
  const updated: SicApprovalCache = {
    entries: [...freshExisting, entry],
    updatedAt: new Date().toISOString(),
  };
  writeDiskCache(projectRoot, updated);
  memoryCache.set(projectRoot, updated);
}

/**
 * Invalidate all memory cache entries for a given project root.
 * Useful in tests to reset state between invocations.
 */
export function invalidateSicApprovalMemoryCache(projectRoot: string): void {
  memoryCache.delete(projectRoot);
}

/**
 * Read the DTC approval from the SIC approval cache for a given project/promptId.
 *
 * Returns null when:
 *   - No SicApprovalEntry exists for the (projectRoot, promptId) pair.
 *   - An entry exists but has no dtcApprovedAt (SIC approved but DTC not yet approved).
 *   - The entry's DTC approval age exceeds the 60-min cache TTL.
 *
 * Returns a DtcApprovalEntry with computed age_ms otherwise.
 *
 * @param projectRoot - project root used as cache scope key
 * @param promptId    - must match exactly (no "unknown" fallback for DTC reads)
 * @param nowMs       - current time in ms (injectable for testing)
 */
export function readDTCApprovalFromCache(
  projectRoot: string,
  promptId: string,
  nowMs: number,
): DtcApprovalEntry | null {
  const entry = checkSicApprovalCache(projectRoot, promptId);
  if (!entry) return null;
  if (!entry.dtcApprovedAt) return null;

  const dtcApprovedMs = new Date(entry.dtcApprovedAt).getTime();
  const age_ms = nowMs - dtcApprovedMs;
  if (age_ms > SIC_CACHE_TTL_MS) return null;

  return {
    projectRoot: entry.projectRoot ?? projectRoot,
    promptId: entry.promptId,
    dtcApprovedAt: entry.dtcApprovedAt,
    dtcFillTurnsCompleted: entry.dtcFillTurnsCompleted ?? 0,
    lastApprovedRubricScore: entry.lastApprovedRubricScore ?? 0,
    age_ms,
  };
}
