// palantir-mini v1.92 / P0.4r — second-brain memory-fold governed event types.
// Verifies ResolutionVerdictEnvelope + MemoryFoldCommittedEnvelope union
// extension + EventSnapshot counter + type-guard correctness, mirroring the
// v3.13.0 sprint-006 paired test pattern.

import { test, expect, describe } from "bun:test";
import {
  isResolutionVerdict,
  isMemoryFoldCommitted,
  eventId,
  sessionId,
  commitSha,
  type EventEnvelope,
  type ResolutionVerdictEnvelope,
  type MemoryFoldCommittedEnvelope,
} from "../../../lib/event-log/types";
import { foldToSnapshot } from "../../../lib/event-log/read/fold-snapshot";

function makeBase(seq: number) {
  return {
    sequence:     seq,
    eventId:      eventId(`e-${seq}`),
    when:         "2026-06-22T00:00:00.000Z",
    atopWhich:    commitSha("abc1234"),
    throughWhich: { sessionId: sessionId("s"), toolName: "t", cwd: "/x" },
    byWhom:       { identity: "claude-code" as const },
  };
}

function makeResolutionVerdict(seq: number): ResolutionVerdictEnvelope {
  return {
    ...makeBase(seq),
    type: "resolution_verdict",
    payload: {
      verdict:     "ADD",
      targetId:    "n_abc123",
      derivedFrom: ["evt-1", "turn-uuid-9"],
    },
  };
}

function makeMemoryFoldCommitted(seq: number): MemoryFoldCommittedEnvelope {
  return {
    ...makeBase(seq),
    type: "memory_fold_committed",
    payload: {
      graphPath: "/home/x/second-brain/graph.json",
      nodeCount: 12,
      edgeCount: 8,
      sessionId: "sess-1",
    },
  };
}

describe("v1.92 — second-brain memory-fold envelope union extension", () => {
  test("isResolutionVerdict narrows correctly", () => {
    const ev: EventEnvelope = makeResolutionVerdict(1);
    expect(isResolutionVerdict(ev)).toBe(true);
    if (isResolutionVerdict(ev)) {
      expect(ev.payload.verdict).toBe("ADD");
      expect(ev.payload.targetId).toBe("n_abc123");
      expect(ev.payload.derivedFrom).toEqual(["evt-1", "turn-uuid-9"]);
    }
  });

  test("resolution_verdict NONE with optional fields omitted is valid", () => {
    const ev: ResolutionVerdictEnvelope = {
      ...makeBase(9),
      type: "resolution_verdict",
      payload: { verdict: "NONE" },
    };
    expect(isResolutionVerdict(ev)).toBe(true);
    if (isResolutionVerdict(ev)) {
      expect(ev.payload.verdict).toBe("NONE");
      expect(ev.payload.targetId).toBeUndefined();
    }
  });

  test("isMemoryFoldCommitted narrows correctly", () => {
    const ev: EventEnvelope = makeMemoryFoldCommitted(2);
    expect(isMemoryFoldCommitted(ev)).toBe(true);
    if (isMemoryFoldCommitted(ev)) {
      expect(ev.payload.nodeCount).toBe(12);
      expect(ev.payload.edgeCount).toBe(8);
      expect(ev.payload.sessionId).toBe("sess-1");
    }
  });

  test("type guards reject mismatched events", () => {
    const rv: EventEnvelope = makeResolutionVerdict(1);
    const mf: EventEnvelope = makeMemoryFoldCommitted(2);
    expect(isMemoryFoldCommitted(rv)).toBe(false);
    expect(isResolutionVerdict(mf)).toBe(false);
  });

  test("foldToSnapshot counts resolution_verdict + memory_fold_committed", () => {
    const events: EventEnvelope[] = [
      makeResolutionVerdict(1),
      makeResolutionVerdict(2),
      makeMemoryFoldCommitted(3),
      makeResolutionVerdict(4),
    ];
    const snap = foldToSnapshot(events);
    expect(snap.resolution_verdict).toBe(3);
    expect(snap.memory_fold_committed).toBe(1);
    expect(snap.totalEvents).toBe(4);
    expect(snap.lastSequence).toBe(4);
  });

  test("foldToSnapshot leaves the new counters undefined when no such events present", () => {
    const snap = foldToSnapshot([]);
    expect(snap.resolution_verdict ?? 0).toBe(0);
    expect(snap.memory_fold_committed ?? 0).toBe(0);
  });
});


describe("W3 workstream C — MemoryFoldCommittedEnvelope additive audit fields", () => {
  test("the 4 original payload fields remain valid with NO new fields present (back-compat)", () => {
    const ev = makeMemoryFoldCommitted(10);
    expect(isMemoryFoldCommitted(ev)).toBe(true);
    expect(ev.payload.fromStatus).toBeUndefined();
    expect(ev.payload.toStatus).toBeUndefined();
    expect(ev.payload.byWhom).toBeUndefined();
    expect(ev.payload.engineVersion).toBeUndefined();
    expect(ev.payload.totalBatches).toBeUndefined();
    expect(ev.payload.foldedAt).toBeUndefined();
  });

  test("all new optional audit fields can be populated together", () => {
    const ev: MemoryFoldCommittedEnvelope = {
      ...makeBase(11),
      type: "memory_fold_committed",
      payload: {
        graphPath: "/home/x/second-brain/graph.json",
        nodeCount: 12,
        edgeCount: 8,
        sessionId: "sess-1",
        fromStatus: "in-progress",
        toStatus: "governed-complete",
        totalBatches: 3,
        foldedAt: "2026-07-02T00:00:00.000Z",
        byWhom: "claude-code",
        engineVersion: "0.1.0",
      },
    };
    expect(isMemoryFoldCommitted(ev)).toBe(true);
    if (isMemoryFoldCommitted(ev)) {
      expect(ev.payload.fromStatus).toBe("in-progress");
      expect(ev.payload.toStatus).toBe("governed-complete");
      expect(ev.payload.totalBatches).toBe(3);
      expect(ev.payload.foldedAt).toBe("2026-07-02T00:00:00.000Z");
      expect(ev.payload.byWhom).toBe("claude-code");
      expect(ev.payload.engineVersion).toBe("0.1.0");
      // original 4 fields untouched
      expect(ev.payload.nodeCount).toBe(12);
      expect(ev.payload.edgeCount).toBe(8);
      expect(ev.payload.sessionId).toBe("sess-1");
      expect(ev.payload.graphPath).toBe("/home/x/second-brain/graph.json");
    }
  });

  test("foldToSnapshot still counts an audit-enriched memory_fold_committed row the same way", () => {
    const enriched: MemoryFoldCommittedEnvelope = {
      ...makeBase(12),
      type: "memory_fold_committed",
      payload: {
        graphPath: "/x/graph.json",
        nodeCount: 1,
        edgeCount: 0,
        sessionId: "sess-2",
        byWhom: "claude-code",
      },
    };
    const snap = foldToSnapshot([enriched]);
    expect(snap.memory_fold_committed).toBe(1);
  });
});
