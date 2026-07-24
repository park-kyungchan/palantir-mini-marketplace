// ADR-006 Unit B: link-mutation existence + cardinality validator unit tests.

import { describe, expect, test } from "bun:test";
import {
  validateLinkMutations,
  type ExistingLinkLookup,
  type LinkMutation,
  type LinkTypeCatalog,
  type LinkTypeDefinition,
} from "../../src/altitude2/link-mutation-validate";

function makeCatalog(defs: readonly LinkTypeDefinition[]): LinkTypeCatalog {
  const byId = new Map(defs.map((d) => [d.link_type_id, d]));
  return {
    getLinkType: (link_type_id: string) => byId.get(link_type_id) ?? null,
  };
}

function makeExisting(links: readonly [string, string, string][]): ExistingLinkLookup {
  const set = new Set(links.map(([lt, s, t]) => `${lt}::${s}::${t}`));
  return {
    has: (link_type_id, source_instance_id, target_instance_id) => set.has(`${link_type_id}::${source_instance_id}::${target_instance_id}`),
    countFrom: (link_type_id, source_instance_id) => {
      let n = 0;
      for (const key of set) {
        const [lt, s] = key.split("::");
        if (lt === link_type_id && s === source_instance_id) n++;
      }
      return n;
    },
    countTo: (link_type_id, target_instance_id) => {
      let n = 0;
      for (const key of set) {
        const [lt, , t] = key.split("::");
        if (lt === link_type_id && t === target_instance_id) n++;
      }
      return n;
    },
  };
}

const ONE_TO_ONE = makeCatalog([{ link_type_id: "lt:1to1", cardinality: "ONE_TO_ONE", source_object_type_id: "A", target_object_type_id: "B" }]);
const ONE_TO_MANY = makeCatalog([{ link_type_id: "lt:1toN", cardinality: "ONE_TO_MANY", source_object_type_id: "A", target_object_type_id: "B" }]);
const MANY_TO_ONE = makeCatalog([{ link_type_id: "lt:Nto1", cardinality: "MANY_TO_ONE", source_object_type_id: "A", target_object_type_id: "B" }]);
const MANY_TO_MANY = makeCatalog([{ link_type_id: "lt:NtoN", cardinality: "MANY_TO_MANY", source_object_type_id: "A", target_object_type_id: "B" }]);

describe("validateLinkMutations: unknown op", () => {
  test("fails with UNKNOWN_OP for an unrecognized op", () => {
    const result = validateLinkMutations(
      [{ op: "REPLACE", link_type_id: "lt:1to1", source_instance_id: "s1", target_instance_id: "t1" }],
      ONE_TO_ONE,
      makeExisting([]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures).toEqual([{ index: 0, code: "UNKNOWN_OP", detail: expect.any(String) }]);
  });
});

describe("validateLinkMutations: link type existence", () => {
  test("fails with UNKNOWN_LINK_TYPE when link_type_id is absent from the catalog", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:does-not-exist", source_instance_id: "s1", target_instance_id: "t1" }],
      ONE_TO_ONE,
      makeExisting([]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("UNKNOWN_LINK_TYPE");
  });

  test("passes a CREATE against a resolvable link type with no conflicts", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:1to1", source_instance_id: "s1", target_instance_id: "t1" }],
      ONE_TO_ONE,
      makeExisting([]),
    );
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

describe("validateLinkMutations: CREATE duplicate (uq_link_inst analog)", () => {
  test("fails with DUPLICATE_LINK when the exact link already exists", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:NtoN", source_instance_id: "s1", target_instance_id: "t1" }],
      MANY_TO_MANY,
      makeExisting([["lt:NtoN", "s1", "t1"]]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("DUPLICATE_LINK");
  });

  test("passes a CREATE of a distinct link under MANY_TO_MANY with no cardinality constraint", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:NtoN", source_instance_id: "s1", target_instance_id: "t2" }],
      MANY_TO_MANY,
      makeExisting([
        ["lt:NtoN", "s1", "t1"],
        ["lt:NtoN", "s2", "t1"],
      ]),
    );
    expect(result.pass).toBe(true);
  });
});

describe("validateLinkMutations: ONE_TO_ONE cardinality", () => {
  test("passes when neither source nor target has any existing link", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:1to1", source_instance_id: "s1", target_instance_id: "t1" }],
      ONE_TO_ONE,
      makeExisting([]),
    );
    expect(result.pass).toBe(true);
  });

  test("fails with CARDINALITY_ONE_TO_ONE_VIOLATION when the source already has an outgoing link", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:1to1", source_instance_id: "s1", target_instance_id: "t2" }],
      ONE_TO_ONE,
      makeExisting([["lt:1to1", "s1", "t1"]]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("CARDINALITY_ONE_TO_ONE_VIOLATION");
  });

  test("fails with CARDINALITY_ONE_TO_ONE_VIOLATION when the target already has an incoming link", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:1to1", source_instance_id: "s2", target_instance_id: "t1" }],
      ONE_TO_ONE,
      makeExisting([["lt:1to1", "s1", "t1"]]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("CARDINALITY_ONE_TO_ONE_VIOLATION");
  });
});

describe("validateLinkMutations: ONE_TO_MANY cardinality", () => {
  test("passes a second source linking to a fresh target", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:1toN", source_instance_id: "s1", target_instance_id: "t2" }],
      ONE_TO_MANY,
      makeExisting([["lt:1toN", "s1", "t1"]]),
    );
    expect(result.pass).toBe(true);
  });

  test("fails with CARDINALITY_ONE_TO_MANY_VIOLATION when the target already has an incoming link", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:1toN", source_instance_id: "s2", target_instance_id: "t1" }],
      ONE_TO_MANY,
      makeExisting([["lt:1toN", "s1", "t1"]]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("CARDINALITY_ONE_TO_MANY_VIOLATION");
  });
});

describe("validateLinkMutations: MANY_TO_ONE cardinality", () => {
  test("passes a second target linked from a fresh source", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:Nto1", source_instance_id: "s2", target_instance_id: "t1" }],
      MANY_TO_ONE,
      makeExisting([["lt:Nto1", "s1", "t1"]]),
    );
    expect(result.pass).toBe(true);
  });

  test("fails with CARDINALITY_MANY_TO_ONE_VIOLATION when the source already has an outgoing link", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:Nto1", source_instance_id: "s1", target_instance_id: "t2" }],
      MANY_TO_ONE,
      makeExisting([["lt:Nto1", "s1", "t1"]]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("CARDINALITY_MANY_TO_ONE_VIOLATION");
  });
});

describe("validateLinkMutations: MANY_TO_MANY cardinality", () => {
  test("passes with no cardinality constraint beyond duplicate detection", () => {
    const result = validateLinkMutations(
      [{ op: "CREATE", link_type_id: "lt:NtoN", source_instance_id: "s1", target_instance_id: "t1" }],
      MANY_TO_MANY,
      makeExisting([
        ["lt:NtoN", "s1", "t9"],
        ["lt:NtoN", "s9", "t1"],
      ]),
    );
    expect(result.pass).toBe(true);
  });
});

describe("validateLinkMutations: DELETE", () => {
  test("passes deleting an existing link", () => {
    const result = validateLinkMutations(
      [{ op: "DELETE", link_type_id: "lt:NtoN", source_instance_id: "s1", target_instance_id: "t1" }],
      MANY_TO_MANY,
      makeExisting([["lt:NtoN", "s1", "t1"]]),
    );
    expect(result.pass).toBe(true);
  });

  test("fails with DELETE_NONEXISTENT when the targeted link does not exist", () => {
    const result = validateLinkMutations(
      [{ op: "DELETE", link_type_id: "lt:NtoN", source_instance_id: "s1", target_instance_id: "t1" }],
      MANY_TO_MANY,
      makeExisting([]),
    );
    expect(result.pass).toBe(false);
    expect(result.failures[0]?.code).toBe("DELETE_NONEXISTENT");
  });
});

describe("validateLinkMutations: total evaluation (never throws, collects all failures)", () => {
  test("a malformed mutation object yields a failure entry at its index, not a throw", () => {
    let threw = false;
    let result: ReturnType<typeof validateLinkMutations> | undefined;
    try {
      result = validateLinkMutations([null, "not-an-object", 42, { op: "CREATE" }], MANY_TO_MANY, makeExisting([]));
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result?.pass).toBe(false);
    expect(result?.failures.map((f) => f.index)).toEqual([0, 1, 2, 3]);
    expect(result?.failures.every((f) => f.code === "MALFORMED_MUTATION")).toBe(true);
  });

  test("aggregates failures across a mixed batch with correct indices (no first-failure-only short-circuit)", () => {
    const catalog = makeCatalog([
      { link_type_id: "lt:1to1", cardinality: "ONE_TO_ONE", source_object_type_id: "A", target_object_type_id: "B" },
      { link_type_id: "lt:NtoN", cardinality: "MANY_TO_MANY", source_object_type_id: "A", target_object_type_id: "B" },
    ]);
    const existing = makeExisting([
      ["lt:1to1", "s1", "t1"],
      ["lt:NtoN", "s2", "t2"],
    ]);
    const mutations: LinkMutation[] = [
      { op: "CREATE", link_type_id: "lt:NtoN", source_instance_id: "s5", target_instance_id: "t5" }, // 0: passes
      { op: "CREATE", link_type_id: "lt:missing", source_instance_id: "s1", target_instance_id: "t1" }, // 1: UNKNOWN_LINK_TYPE
      { op: "CREATE", link_type_id: "lt:NtoN", source_instance_id: "s2", target_instance_id: "t2" }, // 2: DUPLICATE_LINK
      { op: "CREATE", link_type_id: "lt:1to1", source_instance_id: "s1", target_instance_id: "t9" }, // 3: CARDINALITY_ONE_TO_ONE_VIOLATION
      { op: "DELETE", link_type_id: "lt:NtoN", source_instance_id: "s9", target_instance_id: "t9" }, // 4: DELETE_NONEXISTENT
    ];
    const result = validateLinkMutations(mutations, catalog, existing);
    expect(result.pass).toBe(false);
    expect(result.failures).toEqual([
      { index: 1, code: "UNKNOWN_LINK_TYPE", detail: expect.any(String) },
      { index: 2, code: "DUPLICATE_LINK", detail: expect.any(String) },
      { index: 3, code: "CARDINALITY_ONE_TO_ONE_VIOLATION", detail: expect.any(String) },
      { index: 4, code: "DELETE_NONEXISTENT", detail: expect.any(String) },
    ]);
  });

  test("passes an empty batch", () => {
    const result = validateLinkMutations([], MANY_TO_MANY, makeExisting([]));
    expect(result).toEqual({ pass: true, failures: [] });
  });
});
