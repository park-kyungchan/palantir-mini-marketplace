// S1: catalog types + registry (ledger row P450). Structural regression for
// `src/control-plane/{types,registry}.ts` — every catalog entry is
// well-formed, kinds are registered, and there are no duplicate identifiers.

import { describe, expect, test } from "bun:test";
import { isControlPlaneNodeKind, isWellFormedControlPlaneNode, CONTROL_PLANE_NODE_KINDS } from "../../src/control-plane/types";
import { CONTROL_PLANE_CATALOG, findByKind, findDuplicateNodeIds, findDuplicateSourcePaths } from "../../src/control-plane/registry";
import { isPrimitiveKind } from "../../src/altitude1/staged-construction";

describe("CONTROL_PLANE_NODE_KINDS", () => {
  test("carries exactly the 8 ADR-003 fixed values", () => {
    const actual: readonly string[] = [...CONTROL_PLANE_NODE_KINDS].sort();
    expect(actual).toEqual(["adapter", "agent", "generated-binding", "handler", "hook", "profile", "skill", "tool"].sort());
  });

  test("isControlPlaneNodeKind accepts every registered value and rejects garbage", () => {
    for (const kind of CONTROL_PLANE_NODE_KINDS) expect(isControlPlaneNodeKind(kind)).toBe(true);
    expect(isControlPlaneNodeKind("ObjectType")).toBe(false);
    expect(isControlPlaneNodeKind("nonsense")).toBe(false);
    expect(isControlPlaneNodeKind(42)).toBe(false);
  });

  test("is disjoint from the 7-value product-primitive PrimitiveKind enum (zero overlap)", () => {
    for (const kind of CONTROL_PLANE_NODE_KINDS) expect(isPrimitiveKind(kind)).toBe(false);
  });
});

describe("CONTROL_PLANE_CATALOG", () => {
  test("every entry is structurally well-formed", () => {
    for (const entry of CONTROL_PLANE_CATALOG) expect(isWellFormedControlPlaneNode(entry)).toBe(true);
  });

  test("every entry's kind is a registered ControlPlaneNodeKind", () => {
    for (const entry of CONTROL_PLANE_CATALOG) expect(isControlPlaneNodeKind(entry.kind)).toBe(true);
  });

  test("no entry's kind collides with a registered product-primitive kind", () => {
    for (const entry of CONTROL_PLANE_CATALOG) expect(isPrimitiveKind(entry.kind)).toBe(false);
  });

  test("carries exactly 15 entries (7 checkers + 3 generators + 2 generated artifacts + 3 planned adapters)", () => {
    expect(CONTROL_PLANE_CATALOG.length).toBe(15);
  });

  test("no duplicate nodeId or sourcePath", () => {
    expect(findDuplicateNodeIds(CONTROL_PLANE_CATALOG)).toEqual([]);
    expect(findDuplicateSourcePaths(CONTROL_PLANE_CATALOG)).toEqual([]);
  });

  test("findByKind returns only matching entries", () => {
    const adapters = findByKind(CONTROL_PLANE_CATALOG, "adapter");
    expect(adapters.length).toBe(3);
    for (const entry of adapters) expect(entry.kind).toBe("adapter");
  });

  test("every planned entry's runtimeScope is one of codex/claude/gemini (never 'all' for a per-runtime adapter)", () => {
    const planned = CONTROL_PLANE_CATALOG.filter((e) => e.status === "planned");
    expect(planned.length).toBe(3);
    for (const entry of planned) expect(["codex", "claude", "gemini"]).toContain(entry.runtimeScope);
  });
});
