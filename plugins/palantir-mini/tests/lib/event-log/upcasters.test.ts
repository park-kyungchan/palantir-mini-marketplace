// palantir-mini v1.92 / P0.4 — EventEnvelope on-read upcaster round-trip test.
// Verifies upcastEnvelope() is an identity transform for rows whose envelopeRev
// is undefined / 0 / current, and that an explicit current rev round-trips
// unchanged. (Future-rev chains add their own cases when an upcaster registers.)

import { test, expect, describe } from "bun:test";
import {
  upcastEnvelope,
  CURRENT_ENVELOPE_REV,
  UPCASTER_REGISTRY,
} from "../../../lib/event-log/upcasters";
import {
  eventId,
  sessionId,
  commitSha,
  type EventEnvelope,
} from "../../../lib/event-log/types";

function makeRow(envelopeRev?: number): EventEnvelope {
  const base = {
    sequence:     1,
    eventId:      eventId("e-up-1"),
    when:         "2026-06-22T00:00:00.000Z",
    atopWhich:    commitSha("abc1234"),
    throughWhich: { sessionId: sessionId("s"), toolName: "t", cwd: "/x" },
    byWhom:       { identity: "claude-code" as const },
    type:         "memory_fold_committed" as const,
    payload: {
      graphPath: "/home/x/second-brain/graph.json",
      nodeCount: 3,
      edgeCount: 2,
      sessionId: "sess-1",
    },
  };
  return envelopeRev === undefined ? base : { ...base, envelopeRev };
}

describe("P0.4 — upcastEnvelope on-read transform", () => {
  test("CURRENT_ENVELOPE_REV is 0 and the registry is empty (no migrations yet)", () => {
    expect(CURRENT_ENVELOPE_REV).toBe(0);
    expect(Object.keys(UPCASTER_REGISTRY).length).toBe(0);
  });

  test("envelopeRev undefined round-trips UNCHANGED (identity)", () => {
    const row = makeRow(undefined);
    const out = upcastEnvelope(row);
    // same object reference (true identity, not a clone) — no transform applied
    expect(out).toBe(row as unknown as ReturnType<typeof upcastEnvelope>);
    expect(out).toEqual(row);
    expect((out as { envelopeRev?: number }).envelopeRev).toBeUndefined();
  });

  test("envelopeRev 0 round-trips UNCHANGED (explicit current rev)", () => {
    const row = makeRow(0);
    const out = upcastEnvelope(row);
    expect(out).toEqual(row);
    expect((out as { envelopeRev?: number }).envelopeRev).toBe(0);
  });

  test("envelopeRev 1 (>= current) round-trips UNCHANGED (forward-compat row)", () => {
    // A row tagged with a FUTURE rev (>= current) is returned as-is — a reader on
    // an older binary does not down-cast; it passes the row through.
    const row = makeRow(1);
    const out = upcastEnvelope(row);
    expect(out).toEqual(row);
    expect((out as { envelopeRev?: number }).envelopeRev).toBe(1);
  });

  test("payload survives the round-trip intact", () => {
    const out = upcastEnvelope(makeRow(0));
    if (out.type === "memory_fold_committed") {
      expect(out.payload.nodeCount).toBe(3);
      expect(out.payload.edgeCount).toBe(2);
      expect(out.payload.graphPath).toBe("/home/x/second-brain/graph.json");
    } else {
      throw new Error("expected memory_fold_committed after upcast");
    }
  });

  test("non-object input is returned unchanged (guard is the caller's job)", () => {
    expect(upcastEnvelope(null)).toBe(null as unknown as EventEnvelope);
    expect(upcastEnvelope(undefined)).toBe(undefined as unknown as EventEnvelope);
  });
});
