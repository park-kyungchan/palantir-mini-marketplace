/**
 * palantir-mini — EventEnvelope on-read upcasters (P0.4)
 * @owner palantirkc-plugin-events
 * @purpose On-read envelope-revision upcasting keyed on `envelopeRev`
 *
 * Pattern (event-driven.io / Marten): a stored event row is NEVER migrated
 * in place. Instead an on-READ transform ("upcaster") brings an older row's
 * shape forward to the CURRENT shape at projection time. The per-row revision
 * tag is `EventEnvelopeBase.envelopeRev` (additive, optional). Absent ⇒ the
 * current revision (identity transform).
 *
 * Deliberately NOT keyed on the module string const EVENT_ENVELOPE_SCHEMA_VERSION
 * (which versions the whole envelope schema, not a single row) — `envelopeRev`
 * is the per-row discriminant.
 */

import type { EventEnvelope } from "../types";

/**
 * The current envelope revision. A row with `envelopeRev` undefined OR equal to
 * CURRENT_ENVELOPE_REV needs no transform (identity). Bump this when a breaking
 * row-shape change ships, and register an upcaster for the OLD rev below.
 */
export const CURRENT_ENVELOPE_REV = 0;

/**
 * A single rev→rev+1 upcaster: takes a raw row at revision `fromRev` and returns
 * the same row advanced one revision toward CURRENT. Pure + total; never mutates
 * its input.
 */
export type EnvelopeUpcaster = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of upcasters keyed by the SOURCE revision they advance FROM. Empty
 * today (rev 0 is current; nothing predates it). A future breaking change adds
 * `0: (raw) => ({ ...raw, /* rev 0→1 transform *\/ envelopeRev: 1 })`, etc.
 * Chains are applied in ascending order until the row reaches CURRENT_ENVELOPE_REV.
 */
export const UPCASTER_REGISTRY: Readonly<Record<number, EnvelopeUpcaster>> = Object.freeze({});

/**
 * Bring a raw events.jsonl row forward to the current envelope shape.
 *
 * - `undefined` / `CURRENT_ENVELOPE_REV` `envelopeRev` ⇒ identity (returned as-is,
 *   cast to EventEnvelope — the caller owns structural validation via
 *   `isEventEnvelope`).
 * - An older `envelopeRev` with a registered upcaster ⇒ apply the chain
 *   ascending until CURRENT, then return.
 * - An older `envelopeRev` with NO registered upcaster (gap in the chain) ⇒
 *   throw, so a missing migration fails loud rather than projecting a stale shape.
 *
 * Non-object / null input is returned unchanged (the caller's structural guard
 * rejects it downstream); we do not throw on garbage here — upcasting is a
 * shape-forward transform, not a validator.
 */
export function upcastEnvelope(raw: unknown): EventEnvelope {
  if (typeof raw !== "object" || raw === null) {
    return raw as EventEnvelope;
  }
  let row = raw as Record<string, unknown>;
  let rev = typeof row.envelopeRev === "number" ? row.envelopeRev : CURRENT_ENVELOPE_REV;

  // Already current (or unversioned ⇒ treated as current): identity.
  if (rev >= CURRENT_ENVELOPE_REV) {
    return row as unknown as EventEnvelope;
  }

  // Apply the ascending upcaster chain until the row reaches CURRENT.
  while (rev < CURRENT_ENVELOPE_REV) {
    const up = UPCASTER_REGISTRY[rev];
    if (!up) {
      throw new Error(
        `upcastEnvelope: no upcaster registered for envelopeRev ${rev} ` +
          `(target ${CURRENT_ENVELOPE_REV}); cannot project a stale row shape forward.`,
      );
    }
    row = up(row);
    const nextRev = typeof row.envelopeRev === "number" ? row.envelopeRev : rev + 1;
    // Guard against a non-advancing upcaster (would loop forever).
    if (nextRev <= rev) {
      throw new Error(
        `upcastEnvelope: upcaster for envelopeRev ${rev} did not advance the revision ` +
          `(got ${nextRev}); aborting to avoid an infinite chain.`,
      );
    }
    rev = nextRev;
  }

  return row as unknown as EventEnvelope;
}
