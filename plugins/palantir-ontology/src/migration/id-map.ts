// ID map builder/translator (ledger row P550, A1-012/MEM-012/X-010, ADR-006).
//
// "ID maps translate legacy ids to successor ids" (mission): `buildIdMap`
// enforces the map is an actual bijection (no legacy id claims two
// successor ids, no successor id is claimed by two legacy ids) -- an id map
// that is not injective in both directions could silently merge or split
// migrated records, defeating the reconciliation proof this same wave adds
// (reconciliation.ts). `translateLegacyId` is the read-side lookup.
//
// This file reuses `RC_SCHEMA_VALIDATION_FAILED` (already registered
// `appliesTo: ["migration-manifest", ...]` in
// contracts/reason-code-registry.json) for a malformed/non-bijective id
// map, rather than inventing a new code: a duplicate-mapped id is a
// malformed load-bearing field of the manifest, the exact condition that
// code's registered `meaning` already covers -- see src/migration/manifest.ts's
// module doc for the full required-terms trace this file shares.

import { type AggregateResult, denied, ok } from "../altitude1/types";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import type { IdMapEntry } from "./manifest";

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("id-map.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

/**
 * Builds a validated id map from raw legacy/successor id pairs. Denied
 * (never thrown) when the map is not a bijection: a duplicate `legacyId` or
 * a duplicate `successorId` would let one migrated record answer to two
 * identities, or two legacy records collapse into one -- undetectable by
 * `reconciliation.ts`'s count/hash check alone, since a merge preserves
 * neither uniquely.
 */
export function buildIdMap(pairs: readonly IdMapEntry[]): AggregateResult<readonly IdMapEntry[]> {
  const seenLegacy = new Set<string>();
  const seenSuccessor = new Set<string>();
  for (const pair of pairs) {
    if (seenLegacy.has(pair.legacyId)) {
      return denied(RC_SCHEMA_VALIDATION_FAILED, `idMap: duplicate legacyId "${pair.legacyId}" — an id map must be a bijection (one successorId per legacyId)`);
    }
    if (seenSuccessor.has(pair.successorId)) {
      return denied(RC_SCHEMA_VALIDATION_FAILED, `idMap: duplicate successorId "${pair.successorId}" — an id map must be a bijection (one legacyId per successorId)`);
    }
    seenLegacy.add(pair.legacyId);
    seenSuccessor.add(pair.successorId);
  }
  return ok(pairs.map((p) => ({ legacyId: p.legacyId, successorId: p.successorId })));
}

/**
 * Pure lookup, legacy id -> successor id. Returns `undefined` on a miss --
 * never fabricates or guesses a successor id (UNKNOWN-is-not-PASS: an
 * un-mapped legacy id is a caller-visible gap, not silently coerced into an
 * apparent match).
 */
export function translateLegacyId(idMap: readonly IdMapEntry[], legacyId: string): string | undefined {
  return idMap.find((e) => e.legacyId === legacyId)?.successorId;
}
