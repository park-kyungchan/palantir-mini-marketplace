// palantir-mini v2.24.0 — harness-eval-circuit-breaker tests (Phase 2a T2)

import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import harnessEvalCircuitBreaker, { findStuckSprints } from "../../hooks/harness-eval-circuit-breaker";

function setupSprintFixture(opts: {
  iteration:        number;
  threshold:        number;
  driftSuspected:   boolean;
  state:            "generating" | "evaluating" | "passed" | "failed" | "aborted";
}): string {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-circuit-"));
  const sprintDir = path.join(tmpRoot, ".palantir-mini", "harness", "sprints", "sprint-001");
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.writeFileSync(
    path.join(sprintDir, "contract.json"),
    JSON.stringify({
      contractId: "test-contract-1",
      sprintNumber: 1,
      iterationLimit: opts.threshold,
      terminationHardThreshold: opts.threshold,
    }),
  );
  fs.writeFileSync(
    path.join(sprintDir, "state.json"),
    JSON.stringify({
      iteration:      opts.iteration,
      state:          opts.state,
      driftSuspected: opts.driftSuspected,
    }),
  );
  return tmpRoot;
}

describe("findStuckSprints", () => {
  test("returns empty when no sprints/ dir", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-empty-"));
    try {
      expect(findStuckSprints(tmp)).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags stuck sprint at iteration cap with drift suspected", () => {
    const tmp = setupSprintFixture({
      iteration: 5,
      threshold: 5,
      driftSuspected: true,
      state: "evaluating",
    });
    try {
      const stuck = findStuckSprints(tmp);
      expect(stuck.length).toBe(1);
      expect(stuck[0]!.sprintId).toBe("sprint-001");
      expect(stuck[0]!.iteration).toBe(5);
      expect(stuck[0]!.threshold).toBe(5);
      expect(stuck[0]!.hasDrift).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("does NOT flag passed sprint (terminal state)", () => {
    const tmp = setupSprintFixture({
      iteration: 5,
      threshold: 5,
      driftSuspected: true,
      state: "passed",
    });
    try {
      expect(findStuckSprints(tmp)).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("does NOT flag below-threshold sprint", () => {
    const tmp = setupSprintFixture({
      iteration: 2,
      threshold: 5,
      driftSuspected: true,
      state: "evaluating",
    });
    try {
      expect(findStuckSprints(tmp)).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("does NOT flag at-cap sprint without drift signal", () => {
    const tmp = setupSprintFixture({
      iteration: 5,
      threshold: 5,
      driftSuspected: false,
      state: "evaluating",
    });
    try {
      expect(findStuckSprints(tmp)).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("harness-eval-circuit-breaker hook", () => {
  test("returns continue (advisory) on clean tree", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-clean-"));
    try {
      const result = await harnessEvalCircuitBreaker({ cwd: tmp });
      expect(result.decision).toBe("continue");
      expect(result.message).toContain("OK");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("returns continue with reason populated when stuck sprints exist", async () => {
    const tmp = setupSprintFixture({
      iteration: 6,
      threshold: 5,
      driftSuspected: true,
      state: "evaluating",
    });
    try {
      const result = await harnessEvalCircuitBreaker({ cwd: tmp });
      expect(result.decision).toBe("continue"); // advisory
      expect(result.message).toContain("advisory");
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("stuck");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("handles null payload gracefully", async () => {
    const result = await harnessEvalCircuitBreaker(null);
    expect(typeof result.message).toBe("string");
    expect(result.message).toBeTruthy();
  });
});
