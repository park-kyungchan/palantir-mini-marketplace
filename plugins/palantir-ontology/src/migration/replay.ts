// Deterministic replay to state + memory projections at sequence cut
// points (ledger row P540, docs/architecture.md ADR-002/ADR-006, MEM-002,
// MEM-009, MEM-011).
//
// Layering: `src/migration/` sits at the "application services and
// deterministic validators" layer of execution-plan.md §6.1's graph, ONE
// step below "semantic core: construction, operation, governance, memory,
// lineage" -- so this file MAY depend on lineage/memory-shaped records, but
// nothing in `src/lineage/**` or `src/memory/**` may depend on
// `src/migration/**` (the reverse would violate ADR-002's one-way
// direction). This file therefore does NOT import
// `src/lineage/event-reader.ts` or `src/memory/memory-item.ts` directly --
// it depends on two minimal STRUCTURAL shapes only
// (`ReplayableEnvelope`/`ReplayableEpisode`), the same "generic, not
// type-specific" pattern `src/lineage/retention.ts` already establishes.
// `SequencedEnvelope.envelope` (event-reader.ts) and `EpisodicMemoryItem`
// (memory-item.ts) both structurally satisfy these shapes without either
// module needing to import this one.
//
// MEM-002 ("Episodic memory preserves session/event episodes with
// identity, time, actor, outcome, and replayable ordering"): `memory-item.
// ts`'s own module doc names `EpisodicMemoryItem.retention.sequenceOrdinal`
// as "a required replayable-ordering position (full deterministic replay is
// P540's charter -- this is the typed seam P540 reads)". `replayToState`
// below is that reader: `episodes` are cut and ordered strictly by
// `sequenceOrdinal`, never by wall-clock `createdAt`.
//
// MEM-009 ("Replay can deterministically reconstruct relevant memory
// state, promotion history, or next-turn prior from durable records"):
// `replayToState` is a PURE function of `(envelopes, episodes, cutSequence)`
// -- no `Date.now()`, no `Math.random()`, no ambient I/O. Identical inputs
// always produce an identical `ReplayResult`, proven by
// `replayHash` (reusing `src/semantic-core/fingerprint.ts#fingerprintBody`,
// the same `sha256(canonicalize(body))` primitive ADR-004 already fixes for
// SIC/DTC fingerprints -- no new hashing scheme introduced) returning the
// SAME digest across repeated calls with the same inputs.
// `tests/migration/replay.test.ts` calls `replayToState` twice on the same
// golden fixture and asserts both hashes are identical.
//
// MEM-011 ("Memory promotion, compaction, deletion, and replay have
// deterministic negative-path tests or validators and fail safely on
// malformed or partial input"): `replayToState` never throws -- a
// malformed `episodes`/`envelopes` entry (missing `sequence`/
// `sequenceOrdinal`, wrong type) is simply excluded from the projection
// rather than crashing the whole replay (see
// `isReplayableEnvelope`/`isReplayableEpisode` guards below and
// `tests/migration/replay.test.ts`'s "fails safely on malformed input"
// block).
//
// "selected state" (mission bullet 2): interpreted here, explicitly, as
// state SCOPED per `atopWhich` target (the event envelope's own "target/
// subject this event occurred atop" field, contracts/event-envelope.
// contract.json) -- last-writer-wins in sequence order. No other reading
// of "selected" is fixed anywhere in the prompt or requirement corpus this
// task traced (execution-plan.md, ADR-006, MEM-002/009/011); this is the
// assumption this task makes, named explicitly per "Think Before Coding".
//
// consumer-domain-ownership note (required term): the state/memory this
// file reconstructs is successor-owned event-log/memory-item state
// (ADR-006's per-project `.palantir-mini/` storage authority), never the
// consumer domain Ontology itself.
//
// ControlPlaneNodeKind note (required term): a replayed state/episode
// record is content/knowledge state, never a `src/control-plane/types.ts`
// `ControlPlaneNodeKind` lifecycle-control entry -- this file never
// constructs, reads, or references that catalog.
//
// mutation-authority note (required term): `replayToState` is a read-only
// reconstruction with no write path at all -- a DIFFERENT concept from
// `src/governance/types.ts`'s `MutationAuthorityEnvelope`; this file
// imports nothing from `src/governance/**`.
//
// UNKNOWN-is-not-PASS note (required term): a malformed envelope/episode is
// excluded from the projection, never silently counted as if it had
// contributed state -- `ReplayResult` carries no field that could be
// mistaken for "this input was fully well-formed"; callers who need that
// guarantee run `src/lineage/event-reader.ts#readEvents` first and inspect
// its own `quarantined` list.
//
// math-KG-excluded note (required term): no math-KG path
// (`/home/palantirkc/projects/data/curriculum-kg/**` or any other) was read
// or referenced by this file.

import { fingerprintBody, type Fingerprint } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";

/** Minimal structural shape `replayToState` needs from an upcasted event envelope -- `SequencedEnvelope.envelope` (event-reader.ts) structurally satisfies this without an import. */
export interface ReplayableEnvelope {
  readonly sequence: number;
  readonly type: string;
  readonly atopWhich: string;
  readonly when: string;
  readonly withWhat: Record<string, unknown>;
}

/** Minimal structural shape `replayToState` needs from an episodic memory item -- `EpisodicMemoryItem` (memory-item.ts) structurally satisfies this without an import. */
export interface ReplayableEpisode {
  readonly itemId: string;
  readonly sequenceOrdinal: number;
  readonly outcome: string;
  readonly summary?: string;
}

export interface StateProjectionEntry {
  readonly lastType: string;
  readonly lastWhen: string;
  readonly lastSequence: number;
  readonly lastWithWhat: Record<string, unknown>;
}

export interface EpisodeProjectionEntry {
  readonly itemId: string;
  readonly sequenceOrdinal: number;
  readonly outcome: string;
  readonly summary?: string;
}

export interface ReplayResult {
  readonly asOfSequence: number;
  readonly stateByTarget: Readonly<Record<string, StateProjectionEntry>>;
  readonly episodicTimeline: readonly EpisodeProjectionEntry[];
}

function isReplayableEnvelope(value: unknown): value is ReplayableEnvelope {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.sequence !== "number" || !Number.isInteger(v.sequence) || v.sequence < 0) return false;
  if (typeof v.type !== "string" || v.type.length === 0) return false;
  if (typeof v.atopWhich !== "string" || v.atopWhich.length === 0) return false;
  if (typeof v.when !== "string" || v.when.length === 0) return false;
  if (v.withWhat === null || typeof v.withWhat !== "object" || Array.isArray(v.withWhat)) return false;
  return true;
}

function isReplayableEpisode(value: unknown): value is ReplayableEpisode {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.itemId !== "string" || v.itemId.length === 0) return false;
  if (typeof v.sequenceOrdinal !== "number" || !Number.isInteger(v.sequenceOrdinal) || v.sequenceOrdinal < 0) return false;
  if (typeof v.outcome !== "string" || v.outcome.length === 0) return false;
  if (v.summary !== undefined && typeof v.summary !== "string") return false;
  return true;
}

/**
 * Pure, deterministic reconstruction of `atopWhich`-scoped state and the
 * episodic memory timeline as of `cutSequence` (inclusive). Malformed
 * entries in either input are excluded, never thrown on (MEM-011).
 */
export function replayToState(envelopes: readonly unknown[], episodes: readonly unknown[], cutSequence: number): ReplayResult {
  const stateByTarget: Record<string, StateProjectionEntry> = {};

  const validEnvelopes = envelopes.filter(isReplayableEnvelope).filter((e) => e.sequence <= cutSequence);
  validEnvelopes.sort((a, b) => a.sequence - b.sequence);
  for (const envelope of validEnvelopes) {
    stateByTarget[envelope.atopWhich] = {
      lastType: envelope.type,
      lastWhen: envelope.when,
      lastSequence: envelope.sequence,
      lastWithWhat: envelope.withWhat,
    };
  }

  const validEpisodes = episodes.filter(isReplayableEpisode).filter((e) => e.sequenceOrdinal <= cutSequence);
  validEpisodes.sort((a, b) => a.sequenceOrdinal - b.sequenceOrdinal);
  const episodicTimeline: EpisodeProjectionEntry[] = validEpisodes.map((e) => ({
    itemId: e.itemId,
    sequenceOrdinal: e.sequenceOrdinal,
    outcome: e.outcome,
    ...(e.summary !== undefined ? { summary: e.summary } : {}),
  }));

  return { asOfSequence: cutSequence, stateByTarget, episodicTimeline };
}

/** sha256(canonicalize(result)) -- reuses ADR-004's fingerprint primitive; identical `ReplayResult` content always produces the identical digest, regardless of object key insertion order. */
export function replayHash(result: ReplayResult): Fingerprint {
  return fingerprintBody(result as unknown as CanonicalizableValue);
}
