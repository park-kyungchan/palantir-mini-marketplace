// Rollback (ledger row P550, A1-012/MEM-012/X-010, ADR-006/ADR-008).
//
// "rollback restores a checkpoint deterministically" (mission):
// `restoreCheckpoint` below always resolves to the SAME checkpoint given
// the same `(checkpoints, rollback)` inputs (it delegates the actual
// selection to `checkpoint.ts#latestPassedCheckpoint`, itself pure) --
// `tests/migration/rollback.test.ts` calls it twice on the same fixture and
// asserts both results are identical, the same determinism proof
// `replay.ts`/`replay.test.ts` already established for replay.
//
// `requireRollbackIfFailed` is the OTHER half: "a checkpoint reached
// status:\"failed\" and rollback.available must be exercised before the
// migration can proceed" is `RC-MIGRATION-ROLLBACK-REQUIRED`'s exact
// registered meaning (contracts/reason-code-registry.json) -- this
// function is that gate's literal implementation.
//
// Reason-code reuse note (explicit, not silent, per "Think Before Coding"):
// `restoreCheckpoint` ALSO denies with `RC-MIGRATION-ROLLBACK-REQUIRED` when
// `rollback.available` is `false` or no checkpoint has ever passed -- a
// distinct failure mode from "a checkpoint failed", but there is no
// narrower registered code for "rollback recorded as unavailable" and this
// wave's scope (three pre-registered `migration` codes,
// contracts/reason-code-registry.json) does not license inventing a new
// one. Both conditions share the same practical consequence -- "the
// migration cannot safely proceed via its rollback path right now" -- so
// this file reuses the one registered code for both rather than fabricate
// an unregistered string. A narrower split is left to a future wave if
// this reuse ever proves too coarse in practice.
//
// ADR-008 note: rollback here restores the SUCCESSOR-side checkpoint only
// -- it never writes to, or reads a write target from, the legacy store;
// `sourceStore` never changes across a rollback, matching this same wave's
// copy-only direction rule (`manifest.ts#checkCopyOnlyDirection`).

import { type AggregateResult, denied, ok } from "../altitude1/types";
import { isRegisteredReasonCode, RC_MIGRATION_ROLLBACK_REQUIRED, type ReasonCode } from "../semantic-core/reason-codes";
import { anyCheckpointFailed, latestPassedCheckpoint } from "./checkpoint";
import type { Checkpoint, RollbackDescriptor } from "./manifest";

const CITED_CODES: readonly ReasonCode[] = [RC_MIGRATION_ROLLBACK_REQUIRED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("rollback.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

/** Denies with `RC-MIGRATION-ROLLBACK-REQUIRED` iff any checkpoint has `status: "failed"`; `ok` otherwise. */
export function requireRollbackIfFailed(checkpoints: readonly Checkpoint[]): AggregateResult<null> {
  if (anyCheckpointFailed(checkpoints)) {
    return denied(RC_MIGRATION_ROLLBACK_REQUIRED, 'a checkpoint reached status "failed" — rollback must be exercised before this migration can proceed (ADR-006)');
  }
  return ok(null);
}

/**
 * Deterministically resolves the checkpoint a rollback would restore to.
 * Denied when `rollback.available` is `false` (no recorded rollback
 * procedure), or when no checkpoint has ever reached `status: "passed"`
 * (nothing safe to restore to). Never mutates or inspects the legacy
 * source store -- restoring is a successor-side-only operation.
 */
export function restoreCheckpoint(checkpoints: readonly Checkpoint[], rollback: RollbackDescriptor): AggregateResult<Checkpoint> {
  if (!rollback.available) {
    return denied(RC_MIGRATION_ROLLBACK_REQUIRED, 'rollback.available is false — no rollback procedure is recorded for this manifest');
  }
  const target = latestPassedCheckpoint(checkpoints);
  if (target === null) {
    return denied(RC_MIGRATION_ROLLBACK_REQUIRED, 'no checkpoint with status "passed" exists to roll back to');
  }
  return ok(target);
}
