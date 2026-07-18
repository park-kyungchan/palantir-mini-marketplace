// Hash/count reconciliation (ledger row P550, A1-012/MEM-012/X-010,
// docs/architecture.md ADR-004/ADR-006).
//
// "hash/count reconciliation proves nothing lost" (mission): `computeReconciliation`
// is a pure function of the source and target item collections -- it reuses
// `fingerprintBody` (src/semantic-core/fingerprint.ts, ADR-004's
// `sha256(canonicalize(body))` primitive, the same one `replay.ts`'s
// `replayHash` already reuses -- no new hashing scheme introduced) over each
// collection independently, so `expectedHash`/`actualHash` are content
// hashes of the source-read and target-write collections respectively, not
// per-item hashes. Two collections with the same items in a different
// array order produce DIFFERENT hashes here deliberately: array element
// order is semantic content per `canonical-json.ts`'s own documented
// algorithm (only object-key order is normalized away), and a migration
// that silently reorders records is exactly the kind of "nothing lost"
// violation this reconciliation is meant to catch (a reordering could hide
// a swap between two similar records).
//
// `evaluateReconciliation` is the pass/fail judgment: count checked before
// hash (a count mismatch is reported as a count problem, not re-derived as
// a hash problem it would also happen to cause), using the two already-
// registered `migration` category codes.

import { fingerprintBody, type Fingerprint } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { type AggregateResult, denied, ok } from "../altitude1/types";
import { isRegisteredReasonCode, RC_MIGRATION_COUNT_MISMATCH, RC_MIGRATION_HASH_MISMATCH, type ReasonCode } from "../semantic-core/reason-codes";
import type { Reconciliation } from "./manifest";

const CITED_CODES: readonly ReasonCode[] = [RC_MIGRATION_COUNT_MISMATCH, RC_MIGRATION_HASH_MISMATCH];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("reconciliation.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

/** sha256(canonicalize(items)) over the whole collection -- reuses ADR-004's fingerprint primitive, the same one `src/migration/replay.ts#replayHash` already established. */
function collectionHash(items: readonly CanonicalizableValue[]): Fingerprint {
  return fingerprintBody(items);
}

/**
 * Builds the `reconciliation` block of a `MigrationManifest` from the
 * actual source-read and target-write collections. Pure: identical inputs
 * always produce an identical result (no `Date.now()`, no ambient I/O).
 */
export function computeReconciliation(sourceItems: readonly CanonicalizableValue[], targetItems: readonly CanonicalizableValue[]): Reconciliation {
  return {
    expectedCount: sourceItems.length,
    actualCount: targetItems.length,
    expectedHash: collectionHash(sourceItems),
    actualHash: collectionHash(targetItems),
  };
}

/**
 * Judges an already-built `reconciliation` block. `denied` with
 * `RC-MIGRATION-COUNT-MISMATCH` or `RC-MIGRATION-HASH-MISMATCH` on the
 * first check that fails (count first); `ok` only when both counts and
 * both hashes match, proving zero loss.
 */
export function evaluateReconciliation(reconciliation: Reconciliation): AggregateResult<Reconciliation> {
  if (reconciliation.actualCount !== reconciliation.expectedCount) {
    return denied(
      RC_MIGRATION_COUNT_MISMATCH,
      `actualCount (${reconciliation.actualCount}) does not equal expectedCount (${reconciliation.expectedCount}) — the migration lost or duplicated item(s)`,
    );
  }
  if (reconciliation.actualHash !== reconciliation.expectedHash) {
    return denied(
      RC_MIGRATION_HASH_MISMATCH,
      `actualHash (${reconciliation.actualHash}) does not equal expectedHash (${reconciliation.expectedHash}) — migrated content diverged from source content`,
    );
  }
  return ok(reconciliation);
}
