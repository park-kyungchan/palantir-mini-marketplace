// palantir-mini — retention planning tests (W3 workstream D, LEARN lane).
// planRetention() is PURE (no I/O) — unit tests cover age eligibility, count-cap
// eligibility, precedence/non-double-listing, and that non-governed-complete /
// legacy-shape markers are NEVER compacted.

import { test, expect, describe } from "bun:test";
import {
  planRetention,
  DEFAULT_FOLD_RETENTION_POLICY,
  type RetentionManifestInput,
  type RetentionPolicy,
} from "../../../lib/second-brain/retention";

const NOW = new Date("2026-07-02T00:00:00.000Z");

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

function gcMarker(foldedAt: string): Record<string, unknown> {
  return {
    status: "governed-complete",
    graphBatchesPersisted: 1,
    governedBatches: 1,
    totalBatches: 1,
    nodeCount: 1,
    edgeCount: 0,
    startedAt: foldedAt,
    foldedAt,
  };
}

const POLICY: RetentionPolicy = { liveDays: 30, maxLiveEntries: 100, reason: "test policy" };

describe("planRetention — age eligibility", () => {
  test("a governed-complete marker older than liveDays is compactable (reason: age)", () => {
    const manifest: RetentionManifestInput = { foldedSessions: { old: gcMarker(daysAgo(40)) } };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.compactable.map((c) => c.sessionId)).toEqual(["old"]);
    expect(plan.compactable[0]?.reason).toBe("age");
    expect(plan.retained).toEqual([]);
  });

  test("a governed-complete marker within liveDays is retained", () => {
    const manifest: RetentionManifestInput = { foldedSessions: { fresh: gcMarker(daysAgo(5)) } };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.compactable).toEqual([]);
    expect(plan.retained).toEqual(["fresh"]);
  });

  test("boundary: EXACTLY liveDays old is compactable (>= comparison)", () => {
    const manifest: RetentionManifestInput = { foldedSessions: { boundary: gcMarker(daysAgo(30)) } };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.compactable.map((c) => c.sessionId)).toEqual(["boundary"]);
  });

  test("boundary: one millisecond under liveDays is retained", () => {
    const almostThirty = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000 + 1).toISOString();
    const manifest: RetentionManifestInput = { foldedSessions: { almost: gcMarker(almostThirty) } };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.retained).toEqual(["almost"]);
  });
});

describe("planRetention — count-cap eligibility", () => {
  test("exceeding maxLiveEntries flags the OLDEST excess as count-cap, even within liveDays", () => {
    const policy: RetentionPolicy = { liveDays: 365, maxLiveEntries: 2, reason: "cap test" };
    const manifest: RetentionManifestInput = {
      foldedSessions: {
        a: gcMarker(daysAgo(10)),
        b: gcMarker(daysAgo(9)),
        c: gcMarker(daysAgo(8)),
        d: gcMarker(daysAgo(7)),
      },
    };
    const plan = planRetention(manifest, policy, NOW);
    // oldest first: a (10d), b (9d) are the 2 excess over cap=2 (4 entries - 2 cap = 2 excess)
    expect(plan.compactable.map((c) => c.sessionId).sort()).toEqual(["a", "b"]);
    expect(plan.compactable.every((c) => c.reason === "count-cap")).toBe(true);
    expect([...plan.retained].sort()).toEqual(["c", "d"]);
  });

  test("under the cap → nothing count-cap-compacted", () => {
    const policy: RetentionPolicy = { liveDays: 365, maxLiveEntries: 10, reason: "cap test" };
    const manifest: RetentionManifestInput = { foldedSessions: { a: gcMarker(daysAgo(1)) } };
    const plan = planRetention(manifest, policy, NOW);
    expect(plan.compactable).toEqual([]);
  });

  test("a marker already flagged for AGE is never ALSO flagged for count-cap (no double-listing)", () => {
    const policy: RetentionPolicy = { liveDays: 5, maxLiveEntries: 1, reason: "both" };
    const manifest: RetentionManifestInput = {
      foldedSessions: {
        veryOld: gcMarker(daysAgo(100)), // age-eligible
        alsoOldButNewer: gcMarker(daysAgo(6)), // age-eligible too (>5d)
      },
    };
    const plan = planRetention(manifest, policy, NOW);
    const ids = plan.compactable.map((c) => c.sessionId);
    expect(ids.sort()).toEqual(["alsoOldButNewer", "veryOld"]);
    // every reason is "age" — none additionally counted toward count-cap accounting
    expect(plan.compactable.every((c) => c.reason === "age")).toBe(true);
  });
});

describe("planRetention — never compacts non-governed-complete or legacy markers", () => {
  test("a \"pending\" marker is always retained", () => {
    const manifest: RetentionManifestInput = {
      foldedSessions: { p: { status: "pending", sessionId: "p", transcriptPath: "t", bookmarkedAt: "b", runtime: "r" } },
    };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.compactable).toEqual([]);
    expect(plan.retained).toEqual(["p"]);
  });

  test("an \"in-progress\" marker is always retained regardless of age", () => {
    const manifest: RetentionManifestInput = {
      foldedSessions: {
        ip: { status: "in-progress", graphBatchesPersisted: 1, governedBatches: 0, totalBatches: 3, nodeCount: 1, edgeCount: 0, startedAt: daysAgo(400) },
      },
    };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.retained).toEqual(["ip"]);
  });

  test("an OLD write-once legacy marker (no status, no foldedAt-anchored age signal) is always retained", () => {
    const manifest: RetentionManifestInput = {
      foldedSessions: { legacy: { foldedAt: "2020-01-01", nodeCount: 1, edgeCount: 0 } },
    };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.retained).toEqual(["legacy"]);
  });

  test("a governed-complete marker with an unparseable foldedAt is retained (defensive)", () => {
    const manifest: RetentionManifestInput = {
      foldedSessions: { bad: { ...gcMarker(daysAgo(100)), foldedAt: "not-a-date" } },
    };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.retained).toEqual(["bad"]);
  });
});

describe("planRetention — empty / default inputs", () => {
  test("empty foldedSessions → empty plan", () => {
    const plan = planRetention({ foldedSessions: {} }, POLICY, NOW);
    expect(plan.compactable).toEqual([]);
    expect(plan.retained).toEqual([]);
  });

  test("absent foldedSessions key → empty plan (no throw)", () => {
    const plan = planRetention({}, POLICY, NOW);
    expect(plan.compactable).toEqual([]);
    expect(plan.retained).toEqual([]);
  });

  test("DEFAULT_FOLD_RETENTION_POLICY is used when no policy arg is passed", () => {
    const plan = planRetention({ foldedSessions: { fresh: gcMarker(daysAgo(1)) } });
    expect(plan.retained).toEqual(["fresh"]);
    expect(DEFAULT_FOLD_RETENTION_POLICY.liveDays).toBeGreaterThan(0);
    expect(DEFAULT_FOLD_RETENTION_POLICY.maxLiveEntries).toBeGreaterThan(0);
  });
});

describe("planRetention — determinism", () => {
  test("compactable ordering is oldest-foldedAt-first within each reason bucket", () => {
    const manifest: RetentionManifestInput = {
      foldedSessions: {
        newer: gcMarker(daysAgo(31)),
        oldest: gcMarker(daysAgo(60)),
        mid: gcMarker(daysAgo(45)),
      },
    };
    const plan = planRetention(manifest, POLICY, NOW);
    expect(plan.compactable.map((c) => c.sessionId)).toEqual(["oldest", "mid", "newer"]);
  });
});
