// P550 S2: checkpoints (`src/migration/checkpoint.ts`). A1-012/MEM-012/X-010.

import { describe, expect, test } from "bun:test";
import { anyCheckpointFailed, createCheckpoint, latestPassedCheckpoint } from "../../src/migration/checkpoint";

describe("createCheckpoint", () => {
  test("is a pure constructor -- no ambient clock read, caller-supplied `at`", () => {
    const checkpoint = createCheckpoint("chk-1", "2026-07-18T10:00:00Z", "passed");
    expect(checkpoint).toEqual({ checkpointId: "chk-1", at: "2026-07-18T10:00:00Z", status: "passed" });
  });
});

describe("anyCheckpointFailed", () => {
  test("false when no checkpoint has failed", () => {
    expect(anyCheckpointFailed([createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "pending")])).toBe(false);
  });

  test("true when at least one checkpoint has failed", () => {
    expect(anyCheckpointFailed([createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "failed")])).toBe(true);
  });

  test("false for an empty checkpoint list", () => {
    expect(anyCheckpointFailed([])).toBe(false);
  });
});

describe("latestPassedCheckpoint", () => {
  test("returns the last passed checkpoint in array order", () => {
    const checkpoints = [createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "passed"), createCheckpoint("chk-3", "t3", "failed")];
    expect(latestPassedCheckpoint(checkpoints)).toEqual(checkpoints[1]!);
  });

  test("null when no checkpoint has passed", () => {
    expect(latestPassedCheckpoint([createCheckpoint("chk-1", "t1", "pending"), createCheckpoint("chk-2", "t2", "failed")])).toBeNull();
  });

  test("null for an empty checkpoint list", () => {
    expect(latestPassedCheckpoint([])).toBeNull();
  });

  test("is deterministic: repeated calls on the same array return the identical checkpoint", () => {
    const checkpoints = [createCheckpoint("chk-1", "t1", "passed"), createCheckpoint("chk-2", "t2", "pending")];
    expect(latestPassedCheckpoint(checkpoints)).toEqual(latestPassedCheckpoint(checkpoints));
  });
});
