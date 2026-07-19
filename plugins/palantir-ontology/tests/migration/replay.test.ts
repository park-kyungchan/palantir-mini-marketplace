// P540 S2/S3: deterministic replay (`src/migration/replay.ts`) -- MEM-002
// (episodic replayable ordering), MEM-009 (deterministic memory-state
// reconstruction), MEM-011 (fails safely on malformed/partial input).

import { describe, expect, test } from "bun:test";
import { readEvents } from "../../src/lineage/event-reader";
import { replayHash, replayToState } from "../../src/migration/replay";
import golden from "../fixtures/replay/golden-1.json";

/** Adapts a `readEvents` `SequencedEnvelope` to `replayToState`'s flat `ReplayableEnvelope` shape -- the integration seam a real caller (a future replay CLI/handler) performs; `replay.ts` itself never imports `event-reader.ts` (see that file's module doc, ADR-002 one-way layering). */
function toReplayableEnvelope(sequenced: { sequence: number; envelope: Record<string, unknown> }): Record<string, unknown> {
  return { sequence: sequenced.sequence, ...sequenced.envelope };
}

describe("golden replay fixture: end-to-end (reader -> upcaster -> replay), two-run identical hash", () => {
  test("run 1: readEvents quarantines the malformed row, replayToState matches the golden expected result", () => {
    const { envelopes, quarantined } = readEvents(golden.rawRows);
    expect(quarantined.length).toBe(1);
    expect(quarantined[0]!.rawIndex).toBe(golden.expected.malformedRawIndex);
    expect(quarantined[0]!.reasonCode).toBe(golden.expected.malformedReasonCode);

    const result = replayToState(envelopes.map(toReplayableEnvelope), golden.episodes, golden.cutSequence);
    expect(result).toEqual({
      ...golden.expected.result,
      stateByTarget: {
        "fde-session:s1": {
          ...golden.expected.result.stateByTarget["fde-session:s1"],
          lastByWhom: { identity: "agent:claude-sonnet-5", role: "worker" },
        },
        "sic:sic-1": {
          ...golden.expected.result.stateByTarget["sic:sic-1"],
          lastByWhom: { identity: "user:palantirkc", role: "approver" },
        },
      },
    });
  });

  test("run 2 (identical inputs, fresh call): produces the byte-identical result and the identical hash as run 1", () => {
    const run1Events = readEvents(golden.rawRows);
    const run1 = replayToState(run1Events.envelopes.map(toReplayableEnvelope), golden.episodes, golden.cutSequence);
    const run1Hash = replayHash(run1);

    const run2Events = readEvents(golden.rawRows);
    const run2 = replayToState(run2Events.envelopes.map(toReplayableEnvelope), golden.episodes, golden.cutSequence);
    const run2Hash = replayHash(run2);

    expect(run2).toEqual(run1);
    expect(run2Hash).toBe(run1Hash);
    expect(run1Hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("run 3: independently re-derived key order still hashes identically (canonicalization proof, not just object identity)", () => {
    const { envelopes } = readEvents(golden.rawRows);
    const result = replayToState(envelopes.map(toReplayableEnvelope), golden.episodes, golden.cutSequence);
    // Rebuild an equivalent object with keys inserted in a different order.
    const reordered = {
      episodicTimeline: result.episodicTimeline,
      stateByTarget: result.stateByTarget,
      asOfSequence: result.asOfSequence,
    };
    expect(replayHash(reordered)).toBe(replayHash(result));
  });
});

describe("replayToState: determinism (MEM-009) with plain literal inputs", () => {
  const envelopes = [
    { sequence: 0, type: "x", atopWhich: "t1", when: "2026-07-18T00:00:00Z", withWhat: { a: 1 } },
    { sequence: 1, type: "y", atopWhich: "t1", when: "2026-07-18T00:01:00Z", withWhat: { a: 2 } },
  ];
  const episodes = [{ itemId: "m1", sequenceOrdinal: 0, outcome: "ok" }];

  test("two calls with the same inputs produce the identical hash", () => {
    const h1 = replayHash(replayToState(envelopes, episodes, 1));
    const h2 = replayHash(replayToState(envelopes, episodes, 1));
    expect(h1).toBe(h2);
  });

  test("a different cutSequence produces a different (still deterministic) result", () => {
    const atZero = replayToState(envelopes, episodes, 0);
    expect(atZero.stateByTarget.t1!.lastType).toBe("x");
    const atOne = replayToState(envelopes, episodes, 1);
    expect(atOne.stateByTarget.t1!.lastType).toBe("y"); // last-writer-wins in sequence order
  });

  test("no Date.now()/Math.random() leaks into the result: two calls in immediate succession never differ by a timestamp field", () => {
    const a = replayToState(envelopes, episodes, 1);
    const b = replayToState(envelopes, episodes, 1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("preserves event-envelope byWhom in state projections and hashes differ across full actor tuples", () => {
    const markerRole = "weak-provenance: legacy marker";
    const weakIdentity = "legacy-import:events";
    const ordinaryIdentity = "agent:ordinary";
    const base = { sequence: 0, type: "x", atopWhich: "t1", when: "2026-07-18T00:00:00Z", withWhat: { a: 1 } };

    const weak = replayToState([{ ...base, byWhom: { identity: weakIdentity, role: markerRole } }], [], 0);
    const ordinaryCollision = replayToState([{ ...base, byWhom: { identity: ordinaryIdentity, role: markerRole } }], [], 0);
    const weakAgain = replayToState([{ ...base, byWhom: { identity: weakIdentity, role: markerRole } }], [], 0);

    expect(weak.stateByTarget.t1?.lastByWhom).toEqual({ identity: weakIdentity, role: markerRole });
    expect(ordinaryCollision.stateByTarget.t1?.lastByWhom).toEqual({ identity: ordinaryIdentity, role: markerRole });
    expect(replayHash(weak)).not.toBe(replayHash(ordinaryCollision));
    expect(replayHash(weak)).toBe(replayHash(weakAgain));
  });

  test("migration provenance is carried into replay results and changes the replay digest", () => {
    const envelope = { sequence: 0, type: "x", atopWhich: "t1", when: "2026-07-18T00:00:00Z", withWhat: { a: 1 } };
    const weakProvenance = { identity: "legacy-import:events", role: "weak-provenance: evt-1" };
    const ordinaryProvenance = { identity: "agent:ordinary", role: "weak-provenance: evt-1" };

    const weak = replayToState([envelope], [], 0, weakProvenance);
    const ordinary = replayToState([envelope], [], 0, ordinaryProvenance);
    const weakRepeat = replayToState([envelope], [], 0, weakProvenance);

    expect(weak.migrationProvenance).toEqual(weakProvenance);
    expect(ordinary.migrationProvenance).toEqual(ordinaryProvenance);
    expect(replayHash(weak)).not.toBe(replayHash(ordinary));
    expect(replayHash(weak)).toBe(replayHash(weakRepeat));
  });
});

describe("replayToState: fails safely on malformed/partial input (MEM-011), never throws", () => {
  test("a malformed envelope entry (missing atopWhich) is excluded from the projection, not thrown", () => {
    const bad = [{ sequence: 0, type: "x", when: "2026-07-18T00:00:00Z", withWhat: {} }];
    expect(() => replayToState(bad, [], 0)).not.toThrow();
    const result = replayToState(bad, [], 0);
    expect(result.stateByTarget).toEqual({});
  });

  test("a non-integer sequence is excluded, not thrown, not coerced", () => {
    const bad = [{ sequence: "zero", type: "x", atopWhich: "t1", when: "2026-07-18T00:00:00Z", withWhat: {} }];
    const result = replayToState(bad, [], 0);
    expect(result.stateByTarget).toEqual({});
  });

  test("a malformed episode entry (missing outcome) is excluded from episodicTimeline, not thrown", () => {
    const bad = [{ itemId: "m1", sequenceOrdinal: 0 }];
    expect(() => replayToState([], bad, 0)).not.toThrow();
    const result = replayToState([], bad, 0);
    expect(result.episodicTimeline).toEqual([]);
  });

  test("a completely malformed top-level entry (null, string, number) never throws and is excluded from both projections", () => {
    const badEnvelopes = [null, "garbage", 42, { sequence: 0 }];
    const badEpisodes = [null, "garbage", 42, { itemId: "x" }];
    expect(() => replayToState(badEnvelopes, badEpisodes, 100)).not.toThrow();
    const result = replayToState(badEnvelopes, badEpisodes, 100);
    expect(result.stateByTarget).toEqual({});
    expect(result.episodicTimeline).toEqual([]);
  });

  test("a well-formed and a malformed entry mixed together: the good one still contributes, the bad one is silently excluded (never silently counted as if valid, never crashes the batch)", () => {
    const mixed = [
      { sequence: 0, type: "x", atopWhich: "t1", when: "2026-07-18T00:00:00Z", withWhat: {} },
      { sequence: 1 }, // malformed: missing type/atopWhich/when/withWhat
    ];
    const result = replayToState(mixed, [], 1);
    expect(Object.keys(result.stateByTarget)).toEqual(["t1"]);
  });
});
