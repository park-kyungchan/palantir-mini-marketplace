/**
 * tests/lib/impact-query/graph-confidence.test.ts — Unit tests for the pure
 * graph-confidence + agent-use-recommendation helpers introduced in sprint-092
 * PR 2.15.
 *
 * Covers spec.md §3.1 (heuristic) + §3.3 (decision table).
 */

import { test, expect, describe } from "bun:test";
import {
  computeGraphConfidence,
  recommendAgentUseFromConfidence,
  ridHasRecognizedPrefix,
} from "../../../lib/impact-query/graph-confidence";

describe("recommendAgentUseFromConfidence — decision table (spec §3.3)", () => {
  test("≥ 0.7 returns lead-direct", () => {
    expect(recommendAgentUseFromConfidence(0.7)).toBe("lead-direct");
    expect(recommendAgentUseFromConfidence(0.8)).toBe("lead-direct");
    expect(recommendAgentUseFromConfidence(1.0)).toBe("lead-direct");
  });

  test("0.4 to <0.7 returns targeted-verification", () => {
    expect(recommendAgentUseFromConfidence(0.4)).toBe("targeted-verification");
    expect(recommendAgentUseFromConfidence(0.5)).toBe("targeted-verification");
    expect(recommendAgentUseFromConfidence(0.69)).toBe("targeted-verification");
  });

  test(">0.0 to <0.4 returns bounded-explorer", () => {
    expect(recommendAgentUseFromConfidence(0.1)).toBe("bounded-explorer");
    expect(recommendAgentUseFromConfidence(0.2)).toBe("bounded-explorer");
    expect(recommendAgentUseFromConfidence(0.39)).toBe("bounded-explorer");
  });

  test("0.0 returns none", () => {
    expect(recommendAgentUseFromConfidence(0.0)).toBe("none");
  });
});

describe("computeGraphConfidence — heuristic (spec §3.1)", () => {
  test("matched root + 3+ incident edges => 1.0", () => {
    const c = computeGraphConfidence({
      rid: "file:src/foo.ts",
      typedGraphRootMatched: true,
      typedGraphIncidentEdgeCount: 5,
      sqliteHadEvidence: false,
    });
    expect(c).toBeGreaterThanOrEqual(0.7);
    expect(c).toBeLessThanOrEqual(1.0);
    // With 5 incident edges, branch is 1.0 (no sqlite bump => stays 1.0).
    expect(c).toBe(1.0);
  });

  test("matched root + sparse edges => 0.7 base", () => {
    const c = computeGraphConfidence({
      rid: "rule:01",
      typedGraphRootMatched: true,
      typedGraphIncidentEdgeCount: 1,
      sqliteHadEvidence: false,
    });
    expect(c).toBe(0.7);
  });

  test("recognized RID prefix but no typed-graph node => 0.4", () => {
    const c = computeGraphConfidence({
      rid: "file:nonexistent/file.ts",
      typedGraphRootMatched: false,
      typedGraphIncidentEdgeCount: 0,
      sqliteHadEvidence: false,
    });
    expect(c).toBe(0.4);
    expect(recommendAgentUseFromConfidence(c)).toBe("targeted-verification");
  });

  test("unrecognized RID => 0.1 (bounded-explorer)", () => {
    const c = computeGraphConfidence({
      rid: "no-such-prefix-blah",
      typedGraphRootMatched: false,
      typedGraphIncidentEdgeCount: 0,
      sqliteHadEvidence: false,
    });
    expect(c).toBe(0.1);
    expect(recommendAgentUseFromConfidence(c)).toBe("bounded-explorer");
  });

  test("SQLite evidence bumps confidence by 0.1 (capped at 1.0)", () => {
    const bumped = computeGraphConfidence({
      rid: "rule:12",
      typedGraphRootMatched: false,
      typedGraphIncidentEdgeCount: 0,
      sqliteHadEvidence: true,
    });
    // 0.4 base (recognized) + 0.1 bump = 0.5
    expect(bumped).toBeCloseTo(0.5, 5);

    const ceiling = computeGraphConfidence({
      rid: "file:src/foo.ts",
      typedGraphRootMatched: true,
      typedGraphIncidentEdgeCount: 99,
      sqliteHadEvidence: true,
    });
    // 1.0 base + 0.1 bump capped at 1.0
    expect(ceiling).toBe(1.0);
  });
});

describe("ridHasRecognizedPrefix", () => {
  test("recognizes canonical kinds", () => {
    expect(ridHasRecognizedPrefix("file:foo.ts")).toBe(true);
    expect(ridHasRecognizedPrefix("rule:10")).toBe(true);
    expect(ridHasRecognizedPrefix("agent:lead")).toBe(true);
    expect(ridHasRecognizedPrefix("skill:pm-recap")).toBe(true);
    expect(ridHasRecognizedPrefix("handler:emit-event")).toBe(true);
    expect(ridHasRecognizedPrefix("schema:rule")).toBe(true);
    expect(ridHasRecognizedPrefix("event:x")).toBe(true);
    expect(ridHasRecognizedPrefix("test:x.test.ts")).toBe(true);
    expect(ridHasRecognizedPrefix("commit:abcd")).toBe(true);
  });

  test("rejects unknown prefixes", () => {
    expect(ridHasRecognizedPrefix("garbage")).toBe(false);
    expect(ridHasRecognizedPrefix("")).toBe(false);
    expect(ridHasRecognizedPrefix("not:a:known:prefix")).toBe(false);
  });
});
