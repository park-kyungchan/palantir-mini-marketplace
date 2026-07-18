// P550 S3: rollback restores a checkpoint deterministically
// (`src/migration/rollback.ts`). A1-012/MEM-012/X-010, validation-contract
// item 3.

import { describe, expect, test } from "bun:test";
import { createCheckpoint } from "../../src/migration/checkpoint";
import type { Checkpoint, RollbackDescriptor } from "../../src/migration/manifest";
import { requireRollbackIfFailed, restoreCheckpoint } from "../../src/migration/rollback";
import goldenRaw from "../fixtures/migration-manifest/valid-7-projections.json";

const golden = goldenRaw as unknown as { checkpoints: readonly Checkpoint[]; rollback: RollbackDescriptor };

describe("requireRollbackIfFailed", () => {
  test("ok when no checkpoint has failed", () => {
    const result = requireRollbackIfFailed([createCheckpoint("chk-1", "t1", "passed")]);
    expect(result.ok).toBe(true);
  });

  test("denies with RC-MIGRATION-ROLLBACK-REQUIRED when a checkpoint failed", () => {
    const result = requireRollbackIfFailed([createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "failed")]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-ROLLBACK-REQUIRED");
  });

  test("golden fixture (valid-7-projections.json) has a failed checkpoint, so rollback is required", () => {
    const result = requireRollbackIfFailed(golden.checkpoints);
    expect(result.ok).toBe(false);
  });
});

describe("restoreCheckpoint", () => {
  test("denies with RC-MIGRATION-ROLLBACK-REQUIRED when rollback.available is false", () => {
    const result = restoreCheckpoint([createCheckpoint("chk-1", "t1", "passed")], { available: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-ROLLBACK-REQUIRED");
  });

  test("denies with RC-MIGRATION-ROLLBACK-REQUIRED when no checkpoint has ever passed", () => {
    const result = restoreCheckpoint([createCheckpoint("chk-1", "t1", "failed")], { available: true, procedureRef: "docs/migration.md#rollback" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-ROLLBACK-REQUIRED");
  });

  test("restores the last passed checkpoint when rollback is available", () => {
    const checkpoints = [createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "failed")];
    const result = restoreCheckpoint(checkpoints, { available: true, procedureRef: "docs/migration.md#rollback" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(checkpoints[0]!);
  });

  test("is deterministic: two calls on the same checkpoint/rollback inputs restore the identical checkpoint", () => {
    const checkpoints = [createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "failed")];
    const rollback = { available: true, procedureRef: "docs/migration.md#rollback" };
    const run1 = restoreCheckpoint(checkpoints, rollback);
    const run2 = restoreCheckpoint(checkpoints, rollback);
    expect(run2).toEqual(run1);
  });

  test("golden fixture (valid-7-projections.json): rollback restores chk-1 deterministically, never chk-2 (the failed one)", () => {
    const run1 = restoreCheckpoint(golden.checkpoints, golden.rollback);
    const run2 = restoreCheckpoint(golden.checkpoints, golden.rollback);
    expect(run1.ok).toBe(true);
    expect(run2).toEqual(run1);
    if (run1.ok) expect(run1.value.checkpointId).toBe("chk-1");
  });
});
