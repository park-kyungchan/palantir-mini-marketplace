/**
 * tests/lib/impact-query/missing-edges.test.ts — Unit tests for the pure
 * missing-edges computation introduced in sprint-092 PR 2.15.
 *
 * Covers spec.md §3.2.
 */

import { test, expect, describe } from "bun:test";
import { computeMissingEdges } from "../../../lib/impact-query/missing-edges";

describe("computeMissingEdges — pure helper (spec §3.2)", () => {
  test("empty inputs → empty output", () => {
    expect(computeMissingEdges([], [])).toEqual([]);
  });

  test("edge present in typed graph is not reported", () => {
    const legacy = [
      { fromRid: "a", toRid: "b", edgeKind: "imports" },
    ];
    const typed = [
      { fromRid: "a", toRid: "b", kind: "imports" },
    ];
    expect(computeMissingEdges(legacy, typed)).toEqual([]);
  });

  test("edge absent from typed graph is recorded with reason", () => {
    const legacy = [
      { fromRid: "a", toRid: "b", edgeKind: "imports" },
      { fromRid: "c", toRid: "d", edgeKind: "validates" },
    ];
    const typed = [
      { fromRid: "a", toRid: "b", kind: "imports" },
    ];
    const out = computeMissingEdges(legacy, typed);
    expect(out.length).toBe(1);
    expect(out[0]).toEqual({
      fromRid: "c",
      toRid: "d",
      edgeKind: "validates",
      reason: "legacy-edge-not-in-typed-graph",
    });
  });

  test("kind comparison is case-insensitive (IMPORTS vs imports)", () => {
    const legacy = [
      { fromRid: "a", toRid: "b", edgeKind: "IMPORTS" },
    ];
    const typed = [
      { fromRid: "a", toRid: "b", kind: "imports" },
    ];
    expect(computeMissingEdges(legacy, typed)).toEqual([]);
  });

  test("cap honored — last entry carries cap marker when over cap", () => {
    const legacy = Array.from({ length: 60 }, (_, i) => ({
      fromRid: `f${i}`,
      toRid: `t${i}`,
      edgeKind: "describes",
    }));
    const out = computeMissingEdges(legacy, [], { cap: 50 });
    expect(out.length).toBe(50);
    expect(out[out.length - 1]?.reason).toBe("capped-50-additional-omitted");
  });

  test("cap=0 returns empty array", () => {
    const legacy = [{ fromRid: "a", toRid: "b", edgeKind: "imports" }];
    expect(computeMissingEdges(legacy, [], { cap: 0 })).toEqual([]);
  });

  test("under-cap input does not produce a cap marker", () => {
    const legacy = [
      { fromRid: "a", toRid: "b", edgeKind: "imports" },
      { fromRid: "c", toRid: "d", edgeKind: "describes" },
    ];
    const out = computeMissingEdges(legacy, []);
    expect(out.length).toBe(2);
    expect(out.every((r) => r.reason === "legacy-edge-not-in-typed-graph")).toBe(true);
  });
});
