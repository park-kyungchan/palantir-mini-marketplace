// The event-log reader seam (ledger row P540, docs/architecture.md ADR-006,
// P230 §4.1 "Malformed-row quarantine" + §4.2 item 1 "Per-row envelope
// upcasting").
//
// Mission bullet 1: "The event reader invokes the upcaster seam on every
// read (never a raw read that skips upcasting -- this closes P230's
// live-but-empty upcaster-registry gap)." `readEvents` below is the ONLY
// exported way to read raw event-log rows in this module -- there is no
// sibling "raw read" export. Every row this module ever hands back as an
// `envelopes` entry has been through BOTH `validateEventEnvelopeShape` (the
// structural check) AND `upcastEnvelope` (the versioned upcaster chain,
// `./upcaster-chain.ts`), unconditionally, in that order. A caller cannot
// reach an un-upcasted row through this module's public API -- skipping the
// upcaster is structurally impossible, not merely discouraged (see
// `tests/lineage/event-reader.test.ts`'s "structurally impossible to
// bypass" block for the mechanical proof: an export-surface enumeration
// plus a functional round-trip on a deliberately un-upcasted rev-0 row).
//
// Mission bullet 3: "Malformed events are quarantined (never crash the
// reader, never silently dropped)." P230 §4.1's legacy precedent
// (`quarantine.ts`): "any row that fails envelope validation on read...
// Redirect to `quarantine/malformed-rows.jsonl` + manifest, excluded from
// default reads, recoverable via `includeQuarantine:true`... Hard
// invariant 'NEVER blind-delete events'." This module has no persisted
// store yet (no real store exists yet at this wave, matching
// `src/lineage/retention.ts`'s and `src/altitude2/lineage.ts`'s identical
// precedent -- durable event-log storage remains this ADR-006 wave's
// deferred backend decision) -- `readEvents` models the SAME discipline in
// memory: a malformed row is never thrown, never dropped, and never
// returned un-upcasted; it is collected in `quarantined`, each entry
// carrying a stable, registered reason code, exactly mirroring the legacy
// quarantine manifest's "excluded from default reads" (a quarantined row
// never appears in `envelopes`) and "recoverable" (the raw row is preserved
// verbatim on the quarantine entry, never discarded) properties.
//
// TWO distinct quarantine reasons, both loud (never silent), never thrown:
//   - `RC-SCHEMA-VALIDATION-FAILED`: the row fails structural shape
//     validation (a genuinely malformed row -- missing/malformed
//     load-bearing field).
//   - `RC-SCHEMA-VERSION-UNSUPPORTED`: the row is shape-valid but its
//     `envelopeRev` has no upcast path to `CURRENT_ENVELOPE_REV` (ADR-006's
//     "fail loud on an unregistered rev gap", translated into this
//     successor's typed-denial idiom -- see `upcaster-chain.ts`'s module
//     doc for the full reasoning). Distinguishing the two lets a caller
//     tell "this row is garbage" apart from "this row is fine but this
//     build cannot upcast it yet".
//
// `sequence` (mission: "reconstructs selected state and memory projections
// at sequence cut points" -- the seam `src/migration/replay.ts` reads): the
// 0-based position of a row within the SUCCESSFULLY read, append-order
// stream (i.e. `envelopes.length` at the moment it is pushed) -- distinct
// from both `envelopeRev` (row-shape revision) and `when` (wall-clock,
// caller-supplied, never used for ordering here). A quarantined row
// consumes no `sequence` value -- quarantined rows never participate in
// replay ordering, matching the legacy "excluded from default reads"
// property this module already grounds itself in above.
//
// ControlPlaneNodeKind note (required term): an event-log row is
// content/knowledge state (an occurrence in the successor's own event
// stream), never a `src/control-plane/types.ts` `ControlPlaneNodeKind`
// lifecycle-control entry -- this file never constructs, reads, or
// references that catalog.
//
// consumer-domain-ownership note (required term): the rows this reader
// processes are successor-owned event-log state (ADR-006's per-project
// `.palantir-mini/` storage authority), never the consumer domain Ontology
// itself.
//
// UNKNOWN-is-not-PASS note (required term): a row that cannot be read
// cleanly is never silently treated as absent or as a pass -- it is always
// an explicit `QuarantinedRow` entry carrying a stable, registered
// `reasonCode`, and `readEvents`'s return type makes the two outcomes
// (`envelopes` vs `quarantined`) mutually exclusive and both always visible
// to the caller.
//
// math-KG-excluded note (required term): no math-KG path
// (`/home/palantirkc/projects/data/curriculum-kg/**` or any other) was read
// or referenced by this file.

import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { validateEventEnvelopeShape } from "./event-envelope-validate";
import { CURRENT_ENVELOPE_REV, type UpcastableEnvelope, type Upcaster, UPCASTER_REGISTRY, upcastEnvelope } from "./upcaster-chain";

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("event-reader.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface SequencedEnvelope {
  readonly sequence: number;
  readonly envelope: UpcastableEnvelope;
}

export interface QuarantinedRow {
  readonly rawIndex: number;
  readonly reasonCode: ReasonCode;
  readonly detail: string;
  readonly raw: unknown;
}

export interface EventReaderDeps {
  readonly upcasterRegistry?: readonly Upcaster[];
  readonly currentEnvelopeRev?: number;
}

export interface ReadEventsResult {
  readonly envelopes: readonly SequencedEnvelope[];
  readonly quarantined: readonly QuarantinedRow[];
}

/**
 * Reads `rawRows` (append-order, the caller's own raw source -- no I/O
 * happens in this function; no persisted store exists yet at this wave, see
 * module doc) and returns EVERY row's disposition: either a fully upcasted
 * `SequencedEnvelope` in `envelopes`, or a `QuarantinedRow` in `quarantined`.
 * Never throws for a per-row data condition; never returns a row that
 * skipped shape validation or upcasting.
 */
export function readEvents(rawRows: readonly unknown[], deps: EventReaderDeps = {}): ReadEventsResult {
  const registry = deps.upcasterRegistry ?? UPCASTER_REGISTRY;
  const currentRev = deps.currentEnvelopeRev ?? CURRENT_ENVELOPE_REV;

  const envelopes: SequencedEnvelope[] = [];
  const quarantined: QuarantinedRow[] = [];

  rawRows.forEach((raw, rawIndex) => {
    const shapeCheck = validateEventEnvelopeShape(raw);
    if (!shapeCheck.valid) {
      quarantined.push({
        rawIndex,
        reasonCode: RC_SCHEMA_VALIDATION_FAILED,
        detail: shapeCheck.errors.join("; "),
        raw,
      });
      return;
    }

    const upcastResult = upcastEnvelope(raw as UpcastableEnvelope, registry, currentRev);
    if (!upcastResult.ok) {
      quarantined.push({
        rawIndex,
        reasonCode: upcastResult.reasonCode,
        detail: upcastResult.detail,
        raw,
      });
      return;
    }

    envelopes.push({ sequence: envelopes.length, envelope: upcastResult.value });
  });

  return { envelopes, quarantined };
}
