// Checkpoints (ledger row P550, A1-012/MEM-012/X-010, ADR-006).
//
// "checkpoints allow resumable migration" (mission): a checkpoint is a
// point-in-time `{checkpointId, at, status}` marker (matching
// `contracts/migration-manifest.contract.json`'s `checkpoints[]` items
// exactly). `createCheckpoint` is deliberately pure -- the caller supplies
// `at`, never `Date.now()` internally -- mirroring `src/migration/replay.ts`'s
// MEM-009 "no ambient I/O, no wall-clock read" determinism discipline, so a
// checkpoint sequence built from the same inputs is always byte-identical
// and `rollback.ts`'s restore-target selection over it is reproducible.
//
// `latestPassedCheckpoint` treats the checkpoints array's existing order as
// chronological (matching every fixture on disk, e.g.
// `tests/fixtures/migration-manifest/valid-1.json`'s single-entry
// `checkpoints` list) -- it never re-sorts by `at`, since `at` is a
// caller-supplied string, not a value this file parses or trusts as an
// ordering key (a manifest with out-of-order `at` timestamps is a caller
// bug this file does not attempt to silently correct).

import type { Checkpoint } from "./manifest";

/** Pure constructor -- no ambient clock read. */
export function createCheckpoint(checkpointId: string, at: string, status: Checkpoint["status"]): Checkpoint {
  return { checkpointId, at, status };
}

/** True when at least one checkpoint has reached `status: "failed"`. */
export function anyCheckpointFailed(checkpoints: readonly Checkpoint[]): boolean {
  return checkpoints.some((c) => c.status === "failed");
}

/**
 * The deterministic rollback target: the last (highest-index) checkpoint
 * whose `status` is `"passed"`, scanning the array in its given order.
 * `null` when no checkpoint has passed. Two calls with the same array
 * always return the identical checkpoint (by value) -- pure, no shuffling.
 */
export function latestPassedCheckpoint(checkpoints: readonly Checkpoint[]): Checkpoint | null {
  for (let i = checkpoints.length - 1; i >= 0; i -= 1) {
    const candidate = checkpoints[i];
    if (candidate !== undefined && candidate.status === "passed") return candidate;
  }
  return null;
}
