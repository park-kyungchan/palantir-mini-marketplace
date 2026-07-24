// ADR-006 Unit C regression: `evaluateKineticCriteria` — the pre-mutation
// submission-criteria evaluator closing Engine-V2 Gap 2.3.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateKineticCriteria,
  type KineticCriteriaNode,
} from "../../src/governance/kinetic-validation";

const REGISTRY_PATH = join(import.meta.dir, "..", "..", "contracts", "reason-code-registry.json");

function loadRegistryCodes(): Set<string> {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as {
    codes: Array<{ code: string }>;
  };
  return new Set(registry.codes.map((c) => c.code));
}

const REGISTRY_CODES = loadRegistryCodes();

function expectReasonCodesExist(result: { failures: readonly { reason_code: string }[] }): void {
  for (const failure of result.failures) {
    expect(REGISTRY_CODES.has(failure.reason_code)).toBe(true);
  }
}

describe("evaluateKineticCriteria: required leaf", () => {
  test("passes when field present and non-null", () => {
    const criteria: KineticCriteriaNode = { kind: "required", path: "actorId" };
    const result = evaluateKineticCriteria({ actorId: "user-1" }, criteria);
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });

  test("fails when field missing", () => {
    const criteria: KineticCriteriaNode = { kind: "required", path: "actorId" };
    const result = evaluateKineticCriteria({}, criteria);
    expect(result.pass).toBe(false);
    expect(result.failures.length).toBe(1);
    expect(result.failures[0]!.path).toBe("actorId");
    expectReasonCodesExist(result);
  });

  test("fails when field explicitly null", () => {
    const criteria: KineticCriteriaNode = { kind: "required", path: "actorId" };
    const result = evaluateKineticCriteria({ actorId: null }, criteria);
    expect(result.pass).toBe(false);
    expectReasonCodesExist(result);
  });
});

describe("evaluateKineticCriteria: type_conformance leaf", () => {
  test("passes when value matches declared type", () => {
    const criteria: KineticCriteriaNode = { kind: "type_conformance", path: "count", expectedType: "number" };
    const result = evaluateKineticCriteria({ count: 3 }, criteria);
    expect(result.pass).toBe(true);
  });

  test("fails when value does not match declared type", () => {
    const criteria: KineticCriteriaNode = { kind: "type_conformance", path: "count", expectedType: "number" };
    const result = evaluateKineticCriteria({ count: "three" }, criteria);
    expect(result.pass).toBe(false);
    expect(result.failures[0]!.detail).toContain("expected number");
    expectReasonCodesExist(result);
  });

  test("all primitive expectedType kinds pass on matching value", () => {
    const cases: Array<[unknown, "string" | "number" | "boolean" | "object" | "array"]> = [
      ["a", "string"],
      [1, "number"],
      [true, "boolean"],
      [{}, "object"],
      [[], "array"],
    ];
    for (const [value, expectedType] of cases) {
      const criteria: KineticCriteriaNode = { kind: "type_conformance", path: "v", expectedType };
      expect(evaluateKineticCriteria({ v: value }, criteria).pass).toBe(true);
    }
  });
});

describe("evaluateKineticCriteria: enum_membership leaf", () => {
  const criteria: KineticCriteriaNode = { kind: "enum_membership", path: "status", allowed: ["OPEN", "CLOSED"] };

  test("passes when value is an allowed member", () => {
    expect(evaluateKineticCriteria({ status: "OPEN" }, criteria).pass).toBe(true);
  });

  test("fails when value is not an allowed member", () => {
    const result = evaluateKineticCriteria({ status: "DELETED" }, criteria);
    expect(result.pass).toBe(false);
    expectReasonCodesExist(result);
  });
});

describe("evaluateKineticCriteria: version_present leaf", () => {
  const criteria: KineticCriteriaNode = { kind: "version_present", path: "expectedPriorState" };

  test("passes when an expected version is present and non-null", () => {
    expect(evaluateKineticCriteria({ expectedPriorState: "v1" }, criteria).pass).toBe(true);
  });

  test("fails when the expected version is missing (anti-bypass: omission is a failure, not a silent skip)", () => {
    const result = evaluateKineticCriteria({}, criteria);
    expect(result.pass).toBe(false);
    expectReasonCodesExist(result);
  });

  test("fails when the expected version is explicitly null", () => {
    const result = evaluateKineticCriteria({ expectedPriorState: null }, criteria);
    expect(result.pass).toBe(false);
  });
});

describe("evaluateKineticCriteria: custom_predicate leaf", () => {
  const positiveEven: KineticCriteriaNode = {
    kind: "custom_predicate",
    path: "amount",
    name: "positive-even",
    predicate: (value) => typeof value === "number" && value > 0 && value % 2 === 0,
  };

  test("passes when the predicate returns true", () => {
    expect(evaluateKineticCriteria({ amount: 4 }, positiveEven).pass).toBe(true);
  });

  test("fails when the predicate returns false", () => {
    const result = evaluateKineticCriteria({ amount: 3 }, positiveEven);
    expect(result.pass).toBe(false);
    expectReasonCodesExist(result);
  });

  test("fails (not throws) when the predicate itself throws", () => {
    const throwing: KineticCriteriaNode = {
      kind: "custom_predicate",
      path: "amount",
      name: "throws-always",
      predicate: () => {
        throw new Error("boom");
      },
    };
    const result = evaluateKineticCriteria({ amount: 1 }, throwing);
    expect(result.pass).toBe(false);
    expect(result.failures[0]!.detail).toContain("boom");
    expectReasonCodesExist(result);
  });
});

describe("evaluateKineticCriteria: all/any/none composition", () => {
  test("all: passes only when every child passes", () => {
    const criteria: KineticCriteriaNode = {
      all: [
        { kind: "required", path: "a" },
        { kind: "required", path: "b" },
      ],
    };
    expect(evaluateKineticCriteria({ a: 1, b: 2 }, criteria).pass).toBe(true);
    expect(evaluateKineticCriteria({ a: 1 }, criteria).pass).toBe(false);
  });

  test("any: passes when at least one child passes", () => {
    const criteria: KineticCriteriaNode = {
      any: [
        { kind: "enum_membership", path: "status", allowed: ["A"] },
        { kind: "enum_membership", path: "status", allowed: ["B"] },
      ],
    };
    expect(evaluateKineticCriteria({ status: "B" }, criteria).pass).toBe(true);
  });

  test("any: fails and reports all children's failures when every child fails", () => {
    const criteria: KineticCriteriaNode = {
      any: [
        { kind: "enum_membership", path: "status", allowed: ["A"] },
        { kind: "enum_membership", path: "status", allowed: ["B"] },
      ],
    };
    const result = evaluateKineticCriteria({ status: "C" }, criteria);
    expect(result.pass).toBe(false);
    expect(result.failures.length).toBe(2);
    expectReasonCodesExist(result);
  });

  test("none: passes when no forbidden child passes", () => {
    const criteria: KineticCriteriaNode = {
      none: [{ kind: "enum_membership", path: "status", allowed: ["BANNED"] }],
    };
    expect(evaluateKineticCriteria({ status: "OK" }, criteria).pass).toBe(true);
  });

  test("none: fails when a forbidden child passes", () => {
    const criteria: KineticCriteriaNode = {
      none: [{ kind: "enum_membership", path: "status", allowed: ["BANNED"] }],
    };
    const result = evaluateKineticCriteria({ status: "BANNED" }, criteria);
    expect(result.pass).toBe(false);
    expect(result.failures.length).toBe(1);
    expectReasonCodesExist(result);
  });

  test("nested all-of-any-of-none composes correctly", () => {
    const criteria: KineticCriteriaNode = {
      all: [
        { kind: "required", path: "id" },
        {
          any: [
            { kind: "enum_membership", path: "role", allowed: ["admin"] },
            {
              none: [{ kind: "enum_membership", path: "role", allowed: ["banned"] }],
            },
          ],
        },
      ],
    };
    // id present, role "member" is not admin but also not banned -> "none" branch of "any" passes.
    expect(evaluateKineticCriteria({ id: "x", role: "member" }, criteria).pass).toBe(true);
    // id missing -> overall fail regardless of role.
    expect(evaluateKineticCriteria({ role: "member" }, criteria).pass).toBe(false);
    // role banned -> "none" branch fails, and role != admin so "any" fails too.
    expect(evaluateKineticCriteria({ id: "x", role: "banned" }, criteria).pass).toBe(false);
  });
});

describe("evaluateKineticCriteria: multiple-failure aggregation", () => {
  test("reports 2+ failures together, not just the first", () => {
    const criteria: KineticCriteriaNode = {
      all: [
        { kind: "required", path: "a" },
        { kind: "required", path: "b" },
        { kind: "type_conformance", path: "c", expectedType: "number" },
      ],
    };
    const result = evaluateKineticCriteria({ c: "not-a-number" }, criteria);
    expect(result.pass).toBe(false);
    expect(result.failures.length).toBe(3);
    expectReasonCodesExist(result);
  });
});

describe("evaluateKineticCriteria: total evaluation", () => {
  test("a deeply missing field yields a failure finding, never a throw", () => {
    const criteria: KineticCriteriaNode = { kind: "required", path: "a.b.c.d" };
    expect(() => evaluateKineticCriteria({}, criteria)).not.toThrow();
    const result = evaluateKineticCriteria({}, criteria);
    expect(result.pass).toBe(false);
    expectReasonCodesExist(result);
  });

  test("traversing through a non-object intermediate value does not throw", () => {
    const criteria: KineticCriteriaNode = { kind: "required", path: "a.b" };
    expect(() => evaluateKineticCriteria({ a: "not-an-object" }, criteria)).not.toThrow();
    expect(evaluateKineticCriteria({ a: "not-an-object" }, criteria).pass).toBe(false);
  });

  test("null input does not throw", () => {
    const criteria: KineticCriteriaNode = { kind: "required", path: "a" };
    expect(() => evaluateKineticCriteria(null as unknown as Record<string, unknown>, criteria)).not.toThrow();
  });
});

describe("evaluateKineticCriteria: reason-code registry binding", () => {
  test("every reason_code produced across this suite's fixtures exists in the registry", () => {
    const scenarios: Array<[Record<string, unknown>, KineticCriteriaNode]> = [
      [{}, { kind: "required", path: "x" }],
      [{ x: "s" }, { kind: "type_conformance", path: "x", expectedType: "number" }],
      [{ x: "z" }, { kind: "enum_membership", path: "x", allowed: ["a", "b"] }],
      [{}, { kind: "version_present", path: "expectedPriorState" }],
      [
        { x: 1 },
        { kind: "custom_predicate", path: "x", name: "always-false", predicate: () => false },
      ],
    ];
    let sawAtLeastOneFailure = false;
    for (const [input, criteria] of scenarios) {
      const result = evaluateKineticCriteria(input, criteria);
      expect(result.pass).toBe(false);
      for (const failure of result.failures) {
        sawAtLeastOneFailure = true;
        expect(REGISTRY_CODES.has(failure.reason_code)).toBe(true);
      }
    }
    expect(sawAtLeastOneFailure).toBe(true);
  });
});
