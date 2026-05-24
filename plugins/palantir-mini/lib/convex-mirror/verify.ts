/**
 * palantir-mini sprint-103 PR 4.1d — Convex mirror parity helper
 * @owner hook-builder
 * @purpose Pure function to compute local↔Cloud event parity delta.
 *          Used by pm-convex-mirror-verify skill and future handlers.
 *          No I/O — caller supplies local and cloud event arrays.
 *          Per canonical plan v2 §4 row 4.1d.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape of a local event entry required for parity comparison. */
export interface LocalEventEntry {
  eventId: string;
  /** Raw JSON string of the full envelope, used for digest comparison. */
  raw?: string;
}

/** Minimal shape of a Cloud decisionEvent entry returned from Convex. */
export interface CloudEventEntry {
  eventId: string;
  /** Raw JSON payload stored in Cloud, used for digest comparison. */
  raw?: string;
}

/** Delta result returned by computeParityDelta. */
export interface ParityDelta {
  /** Events present in local only (mirror lag or loss). */
  localOnly: number;
  /** Events present in Cloud only (cross-runtime emits or manual inserts). */
  cloudOnly: number;
  /** Events with matching eventId but differing payload digest. */
  mismatched: number;
  /** Events with matching eventId and matching payload digest. */
  matched: number;
  /** Total count of local events sampled. */
  totalLocal: number;
  /** Total count of Cloud events returned for the same window. */
  totalCloud: number;
  /** Up to 5 eventIds where local and Cloud payloads diverged. */
  sampledMismatches: string[];
}

// ─── Pure delta computation ───────────────────────────────────────────────────

/**
 * Compute parity delta between local and Cloud event arrays.
 *
 * Algorithm:
 *  1. Build a Map<eventId, raw> from cloudEvents.
 *  2. Walk localEvents: for each entry, check presence + digest in cloudMap.
 *  3. Remaining cloud entries not seen in local → cloudOnly.
 *
 * Digest comparison: if both sides have a `raw` field, compare them as strings.
 * If either side lacks `raw`, skip digest comparison and count as `matched`
 * on presence alone (conservative — avoids false mismatch on partial schemas).
 */
export function computeParityDelta(
  localEvents: LocalEventEntry[],
  cloudEvents: CloudEventEntry[],
): ParityDelta {
  const cloudMap = new Map<string, CloudEventEntry>();
  for (const ce of cloudEvents) {
    cloudMap.set(ce.eventId, ce);
  }

  let localOnly = 0;
  let mismatched = 0;
  let matched = 0;
  const sampledMismatches: string[] = [];
  const seenInLocal = new Set<string>();

  for (const le of localEvents) {
    seenInLocal.add(le.eventId);
    const ce = cloudMap.get(le.eventId);
    if (!ce) {
      localOnly++;
      continue;
    }
    // Digest comparison
    if (le.raw !== undefined && ce.raw !== undefined && le.raw !== ce.raw) {
      mismatched++;
      if (sampledMismatches.length < 5) {
        sampledMismatches.push(le.eventId);
      }
    } else {
      matched++;
    }
  }

  // Cloud-only: entries in Cloud that were NOT in local
  let cloudOnly = 0;
  for (const [eventId] of cloudMap) {
    if (!seenInLocal.has(eventId)) {
      cloudOnly++;
    }
  }

  return {
    localOnly,
    cloudOnly,
    mismatched,
    matched,
    totalLocal: localEvents.length,
    totalCloud: cloudEvents.length,
    sampledMismatches,
  };
}
