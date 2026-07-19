// Checkpointed rollback drill (ledger row M840, Wave 8).
//
// This module is deliberately pure and in-memory. The caller supplies the
// legacy-shaped copy, the current successor copy, the checkpoint sequence,
// and the checkpoint snapshots. Selection is delegated to rollback.ts, which
// delegates to checkpoint.ts; this file never re-sorts or reselects a target.

import { type AggregateResult, denied, ok } from "../altitude1/types";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { fingerprintBody, type Fingerprint } from "../semantic-core/fingerprint";
import {
  isRegisteredReasonCode,
  RC_MIGRATION_HASH_MISMATCH,
  RC_MIGRATION_ROLLBACK_REQUIRED,
  type ReasonCode,
} from "../semantic-core/reason-codes";
import type { Checkpoint, MigrationByWhom, Reconciliation, RollbackDescriptor } from "./manifest";
import { computeReconciliation, evaluateReconciliation } from "./reconciliation";
import { requireRollbackIfFailed, restoreCheckpoint } from "./rollback";

const CITED_CODES: readonly ReasonCode[] = [RC_MIGRATION_ROLLBACK_REQUIRED, RC_MIGRATION_HASH_MISMATCH];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("rollback-drill.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface CheckpointSnapshot {
  readonly checkpointId: string;
  readonly successorCopy: readonly CanonicalizableValue[];
  readonly migrationProvenance?: MigrationByWhom;
}

export interface CheckpointedRollbackDrillParams {
  readonly legacyCopy: readonly CanonicalizableValue[];
  readonly successorCopy: readonly CanonicalizableValue[];
  readonly checkpoints: readonly Checkpoint[];
  readonly rollback: RollbackDescriptor;
  readonly snapshots: readonly CheckpointSnapshot[];
}

export interface CheckpointedRollbackDrillResult {
  readonly rollbackRequiredReasonCode: ReasonCode;
  readonly restoredCheckpoint: Checkpoint;
  readonly restoredCopy: readonly CanonicalizableValue[];
  readonly restoredMigrationProvenance?: MigrationByWhom;
  readonly restoredDigest: Fingerprint;
  readonly successorBeforeRollbackDigest: Fingerprint;
  readonly reconciliation: Reconciliation;
}

function cloneCopy(items: readonly CanonicalizableValue[]): readonly CanonicalizableValue[] {
  return JSON.parse(JSON.stringify(items)) as readonly CanonicalizableValue[];
}

/**
 * Forces the failed-checkpoint gate, restores the selected passed snapshot,
 * and proves the restored copy reconciles back to the caller-supplied legacy
 * copy. No filesystem, clock, randomness, cache, or legacy-store access.
 */
export function runCheckpointedRollbackDrill(params: CheckpointedRollbackDrillParams): AggregateResult<CheckpointedRollbackDrillResult> {
  const rollbackGate = requireRollbackIfFailed(params.checkpoints);
  if (rollbackGate.ok) {
    return denied(RC_MIGRATION_ROLLBACK_REQUIRED, "rollback drill requires a deliberately failed checkpoint before proceeding");
  }

  const restore = restoreCheckpoint(params.checkpoints, params.rollback);
  if (!restore.ok) return restore;

  const snapshot = params.snapshots.find((s) => s.checkpointId === restore.value.checkpointId);
  if (snapshot === undefined) {
    return denied(RC_MIGRATION_ROLLBACK_REQUIRED, `no caller-supplied successor snapshot exists for checkpoint "${restore.value.checkpointId}"`);
  }

  const restoredCopy = cloneCopy(snapshot.successorCopy);
  const reconciliation = computeReconciliation(params.legacyCopy, restoredCopy);
  const reconciled = evaluateReconciliation(reconciliation);
  if (!reconciled.ok) return reconciled;

  return ok({
    rollbackRequiredReasonCode: rollbackGate.reasonCode,
    restoredCheckpoint: restore.value,
    restoredCopy,
    ...(snapshot.migrationProvenance !== undefined ? { restoredMigrationProvenance: { ...snapshot.migrationProvenance } } : {}),
    restoredDigest: fingerprintBody(restoredCopy),
    successorBeforeRollbackDigest: fingerprintBody(params.successorCopy),
    reconciliation,
  });
}
