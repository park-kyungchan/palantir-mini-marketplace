// palantir-mini v3.13.0 — sprint-006 BackProp loop closure paired test
// Verifies SprintCompletedEnvelope + FailureModeSynthesizedEnvelope union
// extension + EventSnapshot counter + type-guard correctness.

import { test, expect, describe } from "bun:test";
import {
  isSprintCompleted,
  isFailureModeSynthesized,
  eventId,
  sessionId,
  commitSha,
  type EventEnvelope,
  type SprintCompletedEnvelope,
  type FailureModeSynthesizedEnvelope,
} from "../../../lib/event-log/types";
import { foldToSnapshot } from "../../../lib/event-log/read/fold-snapshot";

function makeBase(seq: number) {
  return {
    sequence:     seq,
    eventId:      eventId(`e-${seq}`),
    when:         "2026-04-30T00:00:00.000Z",
    atopWhich:    commitSha("abc1234"),
    throughWhich: { sessionId: sessionId("s"), toolName: "t", cwd: "/x" },
    byWhom:       { identity: "claude-code" as const },
  };
}

function makeSprintCompleted(seq: number): SprintCompletedEnvelope {
  return {
    ...makeBase(seq),
    type: "sprint_completed",
    payload: {
      project:             "test-project",
      sprintNumber:        6,
      contractId:          "sprint-006-quick",
      verdict:             "passed",
      iterationCount:      1,
      bestScore:           0.92,
      terminationCriteria: ["threshold_overall:0.85", "iter:1/1"],
    },
  };
}

function makeFailureMode(seq: number): FailureModeSynthesizedEnvelope {
  return {
    ...makeBase(seq),
    type: "failure_mode_synthesized",
    payload: {
      sprintNumber:        6,
      iteration:           1,
      failureCategory:     "spec_misalignment",
      rootCauseHypothesis: "Generator produced extra field not in spec.",
    },
  };
}

describe("v3.13.0 — sprint-006 BackProp envelope union extension", () => {
  test("isSprintCompleted narrows correctly", () => {
    const ev: EventEnvelope = makeSprintCompleted(1);
    expect(isSprintCompleted(ev)).toBe(true);
    if (isSprintCompleted(ev)) {
      expect(ev.payload.verdict).toBe("passed");
      expect(ev.payload.contractId).toBe("sprint-006-quick");
    }
  });

  test("isFailureModeSynthesized narrows correctly", () => {
    const ev: EventEnvelope = makeFailureMode(2);
    expect(isFailureModeSynthesized(ev)).toBe(true);
    if (isFailureModeSynthesized(ev)) {
      expect(ev.payload.failureCategory).toBe("spec_misalignment");
      expect(ev.payload.iteration).toBe(1);
    }
  });

  test("type guards reject mismatched events", () => {
    const sprint: EventEnvelope = makeSprintCompleted(1);
    const failure: EventEnvelope = makeFailureMode(2);
    expect(isFailureModeSynthesized(sprint)).toBe(false);
    expect(isSprintCompleted(failure)).toBe(false);
  });

  test("foldToSnapshot counts sprint_completed + failure_mode_synthesized", () => {
    const events: EventEnvelope[] = [
      makeSprintCompleted(1),
      makeFailureMode(2),
      makeFailureMode(3),
      makeSprintCompleted(4),
    ];
    const snap = foldToSnapshot(events);
    expect(snap.sprint_completed).toBe(2);
    expect(snap.failure_mode_synthesized).toBe(2);
    expect(snap.totalEvents).toBe(4);
    expect(snap.lastSequence).toBe(4);
  });

  test("foldToSnapshot zero-counts when no BackProp events present", () => {
    const snap = foldToSnapshot([]);
    expect(snap.sprint_completed).toBe(0);
    expect(snap.failure_mode_synthesized).toBe(0);
  });
});
