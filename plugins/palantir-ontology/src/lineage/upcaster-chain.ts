// Versioned event-envelope upcaster chain (ledger row P540, docs/architecture.md
// ADR-006, P230 §4.2 item 1).
//
// Mission ("Connect the event reader to a VERSIONED upcaster chain... Each
// upcaster is versioned; the chain is applied in order"): this file is that
// chain. It models the legacy plugin's own `lib/event-log/upcasters/
// index.ts` `upcastEnvelope` precedent, censused verbatim by P230 §4.2 item
// 1: "an on-read, never-in-place transform keyed on the additive
// `envelopeRev` field... The function fails loud... if it ever encounters a
// `rev` below current with no registered upcaster, and also guards against
// a non-advancing upcaster looping forever." ADR-006 names this "the
// successor's upcaster seam" and fixes the same on-read/fail-loud/
// empty-by-design-is-acceptable discipline.
//
// A1-012 ("Existing constructed ontology state and its lineage have a
// compatible migration/versioning path when contracts, schemas, primitives,
// or storage representations evolve"): `upcastEnvelope` below IS that path
// for the event-envelope row shape specifically -- an old-`envelopeRev` row
// is never read as-is; it is transformed forward, in order, to the shape
// the current build expects, before any caller ever sees it.
//
// "legitimately empty at v1... empty-by-design is acceptable, silently
// absent is not" (ADR-006): this task's OWN validation contract requires
// "the registry is wired (not empty)" -- unlike the legacy plugin (zero
// historical rows predate its rev 0, so its registry is empty for a
// grounded reason), this successor's contract already carries schema
// history (`tests/fixtures/event-envelope/*.json`, `withWhat` open payload)
// from P330 onward. `UPCASTER_REGISTRY` below therefore registers ONE real,
// tested rev0->rev1 transition -- proving the seam actually runs end-to-end,
// not merely that it is structurally present.
//
// "fail loud on an unregistered rev gap" (ADR-006, translated into this
// successor's idiom): the legacy plugin's `upcastEnvelope` literally
// `throw`s. This successor never throws for an expected-data-shape outcome
// -- every other aggregate/gate in this codebase (`envelope-validate.ts`,
// `construction-state-machine.ts`, `retention.ts`) returns a typed
// `AggregateResult` denial citing a stable, REGISTERED reason code instead
// of throwing, which is exactly what "UNKNOWN-is-not-PASS" (required term)
// already commits this codebase to: a denial is never a bare
// `false`/`undefined`, and it is never silently coerced or dropped -- it is
// as "loud" (visible, inspectable, stable-reason-coded) as a thrown
// exception, without introducing this module's only unchecked-exception
// path in an otherwise exception-free codebase. `src/lineage/event-
// reader.ts` (the caller) is the one that decides what a denial here means
// for the read as a whole (quarantine, never crash the reader -- see that
// file's own doc comment).
//
// consumer-domain-ownership note (required term): an event envelope this
// file upcasts is successor-owned event-log state (ADR-006's per-project
// `.palantir-mini/` storage authority), never the consumer domain Ontology
// itself.
//
// mutation-authority note (required term): `upcastEnvelope`'s denial is a
// row-shape-migration check, a DIFFERENT concept from
// `src/governance/types.ts`'s `MutationAuthorityEnvelope` -- it never mints
// or substitutes for a real mutation-authority envelope, and this file
// imports nothing from `src/governance/**`.

import { type AggregateResult, denied, ok } from "../altitude1/types";
import { isRegisteredReasonCode, RC_SCHEMA_VERSION_UNSUPPORTED, type ReasonCode } from "../semantic-core/reason-codes";

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VERSION_UNSUPPORTED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("upcaster-chain.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

/**
 * Minimal per-row shape the upcaster chain needs -- deliberately NOT the
 * full `contracts/event-envelope.contract.json` shape (that belongs to
 * `event-envelope-validate.ts`). Any object carrying a non-negative integer
 * `envelopeRev` and an open `withWhat` bag structurally satisfies this,
 * mirroring `retention.ts`'s "minimal structural shape" precedent.
 */
export interface UpcastableEnvelope {
  readonly envelopeRev: number;
  readonly withWhat: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export interface Upcaster {
  readonly fromRev: number;
  readonly toRev: number;
  readonly upcast: (envelope: UpcastableEnvelope) => UpcastableEnvelope;
}

/** The envelope revision this successor build reads at. Every row must be upcast to this revision before a caller may use it. */
export const CURRENT_ENVELOPE_REV = 1;

/**
 * P540's one real, tested row-shape evolution: rev-0 rows predate the
 * `withWhat.replayCursor` field (additive-only, added at rev 1 for
 * `src/migration/replay.ts`'s deterministic replay seam) -- on read, this
 * upcaster stamps a default `replayCursor: 0` onto a rev-0 row's `withWhat`
 * (never overwriting an already-present value) and never mutates the
 * source row in place (P230 §3.2's inherited "SOURCE EVENTS ARE NEVER
 * MUTATED" discipline -- `upcast` always returns a NEW object).
 */
export const UPCASTER_REGISTRY: readonly Upcaster[] = [
  {
    fromRev: 0,
    toRev: 1,
    upcast: (envelope) => ({
      ...envelope,
      envelopeRev: 1,
      withWhat: { replayCursor: 0, ...envelope.withWhat },
    }),
  },
];

// Belt-and-suspenders self-check: every registered upcaster must strictly
// advance (`toRev > fromRev`) and `fromRev` values must be unique --
// mirrors the reason-code registration self-checks elsewhere in this
// codebase (`memory-item.ts`, `retention.ts`). A registry that violates
// this is a build-time authoring bug, not a runtime data condition, so it
// throws at module load rather than returning a per-call denial.
{
  const seenFromRev = new Set<number>();
  for (const step of UPCASTER_REGISTRY) {
    if (step.toRev <= step.fromRev) {
      throw new Error(`upcaster-chain.ts: registered upcaster fromRev ${step.fromRev} -> toRev ${step.toRev} is non-advancing`);
    }
    if (seenFromRev.has(step.fromRev)) {
      throw new Error(`upcaster-chain.ts: duplicate registered upcaster for fromRev ${step.fromRev}`);
    }
    seenFromRev.add(step.fromRev);
  }
}

/**
 * Applies `registry`, in order, until `envelope.envelopeRev === currentRev`.
 * Fails loud (a stable, registered denial, never a silent pass-through or a
 * thrown exception -- see this file's module doc) on an unregistered rev
 * gap, and guards against a non-advancing/cyclic chain looping forever.
 */
export function upcastEnvelope(
  envelope: UpcastableEnvelope,
  registry: readonly Upcaster[] = UPCASTER_REGISTRY,
  currentRev: number = CURRENT_ENVELOPE_REV,
): AggregateResult<UpcastableEnvelope> {
  let current = envelope;
  const maxIterations = registry.length + 1;
  let iterations = 0;

  while (current.envelopeRev < currentRev) {
    const step = registry.find((u) => u.fromRev === current.envelopeRev);
    if (step === undefined) {
      return denied(
        RC_SCHEMA_VERSION_UNSUPPORTED,
        `upcastEnvelope: no registered upcaster for envelopeRev ${current.envelopeRev} (this build reads at rev ${currentRev}) -- unregistered rev gap`,
      );
    }
    current = step.upcast(current);
    iterations += 1;
    if (iterations > maxIterations) {
      return denied(
        RC_SCHEMA_VERSION_UNSUPPORTED,
        `upcastEnvelope: exceeded ${maxIterations} upcast step(s) without reaching envelopeRev ${currentRev} -- possible registry cycle`,
      );
    }
  }
  if (current.envelopeRev > currentRev) {
    return denied(
      RC_SCHEMA_VERSION_UNSUPPORTED,
      `upcastEnvelope: row envelopeRev ${envelope.envelopeRev} is newer than this build's currentRev ${currentRev} (downgrade is not supported)`,
    );
  }
  return ok(current);
}
