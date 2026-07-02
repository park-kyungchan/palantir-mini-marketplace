// @domain: LEARN
// retention.ts — pure retention planning for second-brain fold markers (W3 workstream D).
//
// Mirrors the T0-T4 tier live/archive/purge semantics of
// #schemas/ontology/primitives/retention-manifest.ts (RetentionPolicy per tier), adapted
// to fold LIFECYCLE MARKERS (manifest.json.foldedSessions entries) instead of event.jsonl
// ROWS: a fold marker has no value-grade tier of its own, so this module defines a single
// POLICY shape (RetentionPolicy below) analogous to one RetentionPolicy tier row — a
// "liveDays" window past which a governed-complete marker becomes compactable, PLUS a
// max-live-entries cap (the marker-count analogue of an archive rotation trigger).
//
// PURE: planRetention() takes the manifest + policy as plain data and returns a plan; it
// performs NO I/O, so it is trivially unit-testable. The CLI (retention-cli.ts) is the
// thin I/O shell around it: read manifest -> planRetention() -> append pruned markers to
// manifest-archive.jsonl -> remove them from the live manifest -> write, all under the
// SAME two-writer manifest lock foldedsessions-bump-cli.ts already uses.
//
// GRAPH.JSON PRUNING IS OUT OF SCOPE (engine-side, out-of-repo) — see cartography/
// DATAFLOW.md's SecondBrain section for the documented contract expectation. This module
// only ever prunes manifest.json.foldedSessions MARKER records, never graph.json content.

/**
 * Retention policy for compactable fold markers. Analogous to one
 * #schemas/ontology/primitives/retention-manifest.ts RetentionPolicy tier row, adapted to
 * marker counts/ages instead of event-row counts/ages.
 *
 * - `liveDays`     — keep a governed-complete marker live for at least this many days
 *                     past its `foldedAt` timestamp before it becomes age-eligible for
 *                     compaction.
 * - `maxLiveEntries` — once the number of governed-complete markers exceeds this cap, the
 *                     OLDEST excess entries (by `foldedAt`, oldest first) become
 *                     count-eligible for compaction even if still within `liveDays`. This
 *                     bounds manifest.json's growth the same way an archive-rotation
 *                     trigger bounds events.jsonl (rule 26 §Substrate routing).
 * - `reason`       — human-readable rationale (mirrors RetentionPolicy.reason).
 */
export interface RetentionPolicy {
  readonly liveDays: number;
  readonly maxLiveEntries: number;
  readonly reason: string;
}

/** Default fold-marker retention policy shipped with palantir-mini. */
export const DEFAULT_FOLD_RETENTION_POLICY: RetentionPolicy = {
  liveDays: 90,
  maxLiveEntries: 500,
  reason:
    "governed-complete fold markers are a lightweight completion record (no event-row payload); " +
    "90d live / 500-entry cap keeps manifest.json bounded without discarding recent session history, " +
    "mirroring rule 26 §Substrate routing T2 (90d live) applied to fold markers instead of event rows.",
};

/** A single manifest.json.foldedSessions record, as read from disk (loosely typed — defensive). */
export type FoldedSessionRecord = Record<string, unknown>;

/** The manifest shape planRetention() reads (loosely typed — mirrors foldedsessions-bump-cli.ts's Manifest). */
export interface RetentionManifestInput {
  readonly foldedSessions?: Readonly<Record<string, FoldedSessionRecord>>;
}

/** One session's fold marker flagged as compactable, with the reason it qualified. */
export interface CompactionCandidate {
  readonly sessionId: string;
  readonly marker: FoldedSessionRecord;
  readonly reason: "age" | "count-cap";
}

export interface RetentionPlan {
  /** Sessions whose markers should be moved to the archive (oldest-first within each reason). */
  readonly compactable: readonly CompactionCandidate[];
  /** Sessions whose markers stay live, unchanged. */
  readonly retained: readonly string[];
}

/** True IFF `rec` is a "governed-complete" marker with a parseable `foldedAt` ISO timestamp. */
function isAgeable(rec: unknown): rec is { status: "governed-complete"; foldedAt: string } {
  if (!rec || typeof rec !== "object") return false;
  const r = rec as Record<string, unknown>;
  if (r.status !== "governed-complete") return false;
  if (typeof r.foldedAt !== "string") return false;
  return !Number.isNaN(Date.parse(r.foldedAt));
}

/**
 * PURE — plan which fold markers in `manifest.foldedSessions` are compactable under
 * `policy`, as of `now` (injectable for deterministic tests; defaults to `new Date()`).
 *
 * Only `status:"governed-complete"` markers with a parseable `foldedAt` are EVER eligible
 * (a `"pending"`/`"in-progress"` marker, or an OLD write-once legacy marker with no
 * `status` field at all, is NEVER compacted — it either isn't done yet, or (for the
 * legacy shape) lacks the `foldedAt`-anchored age signal this policy requires; those stay
 * in `retained`).
 *
 * Two INDEPENDENT eligibility rules (a marker can qualify via either, never double-listed):
 *   1. AGE — `now - foldedAt >= policy.liveDays` days.
 *   2. COUNT-CAP — after excluding age-eligible entries, if the number of REMAINING
 *      governed-complete ageable markers still exceeds `policy.maxLiveEntries`, the
 *      oldest excess (by `foldedAt` ascending) are flagged `"count-cap"` until the
 *      remaining count is at or under the cap.
 *
 * Deterministic ordering: within each reason bucket, oldest `foldedAt` first.
 */
export function planRetention(
  manifest: RetentionManifestInput,
  policy: RetentionPolicy = DEFAULT_FOLD_RETENTION_POLICY,
  now: Date = new Date(),
): RetentionPlan {
  const folded = manifest.foldedSessions ?? {};
  const entries = Object.entries(folded);

  const ageable: Array<{ sessionId: string; marker: FoldedSessionRecord; foldedAtMs: number }> = [];
  const retained: string[] = [];

  for (const [sessionId, marker] of entries) {
    if (isAgeable(marker)) {
      ageable.push({ sessionId, marker, foldedAtMs: Date.parse(marker.foldedAt) });
    } else {
      retained.push(sessionId);
    }
  }

  // Oldest first, deterministic tie-break by sessionId for stable ordering on equal timestamps.
  ageable.sort((a, b) => a.foldedAtMs - b.foldedAtMs || a.sessionId.localeCompare(b.sessionId));

  const liveMs = policy.liveDays * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  const compactable: CompactionCandidate[] = [];
  const remaining: typeof ageable = [];

  for (const e of ageable) {
    if (nowMs - e.foldedAtMs >= liveMs) {
      compactable.push({ sessionId: e.sessionId, marker: e.marker, reason: "age" });
    } else {
      remaining.push(e);
    }
  }

  // remaining is still oldest-first (stable filter preserves order). Trim the oldest
  // excess over the cap.
  const overCap = remaining.length - policy.maxLiveEntries;
  if (overCap > 0) {
    for (let i = 0; i < overCap; i++) {
      const e = remaining[i];
      if (!e) continue; // defensive (noUncheckedIndexedAccess) — overCap <= remaining.length always
      compactable.push({ sessionId: e.sessionId, marker: e.marker, reason: "count-cap" });
    }
  }

  const compactedIds = new Set(compactable.map((c) => c.sessionId));
  for (const e of remaining) {
    if (!compactedIds.has(e.sessionId)) retained.push(e.sessionId);
  }

  return { compactable, retained };
}
