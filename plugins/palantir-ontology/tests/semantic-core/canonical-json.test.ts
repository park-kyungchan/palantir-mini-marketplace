// P410 S1: canonical-JSON serialization unit tests.

import { describe, expect, test } from "bun:test";
import { canonicalize } from "../../src/semantic-core/canonical-json";

describe("canonicalize", () => {
  test("sorts top-level object keys lexicographically", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test("sorts nested object keys at every depth", () => {
    const a = { outer: { z: 1, y: { m: 1, a: 2 } }, first: true };
    expect(canonicalize(a)).toBe('{"first":true,"outer":{"y":{"a":2,"m":1},"z":1}}');
  });

  test("two structurally-identical objects with different key insertion order canonicalize identically", () => {
    const a = { sicId: "s1", fdeSessionId: "f1", approvedMeaning: "x" };
    const b = { approvedMeaning: "x", sicId: "s1", fdeSessionId: "f1" };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  test("preserves array element order (arrays are not sorted)", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  test("sorts object keys inside array elements", () => {
    expect(canonicalize([{ b: 1, a: 1 }])).toBe('[{"a":1,"b":1}]');
  });

  test("produces whitespace-free compact output", () => {
    const out = canonicalize({ a: 1, b: [1, 2] });
    expect(out).not.toMatch(/\s/);
  });

  test("a tampered (changed value) body canonicalizes to a different string", () => {
    const original = { sicId: "s1", approvedMeaning: "Model X as an ObjectType" };
    const tampered = { sicId: "s1", approvedMeaning: "Model X as a ControlPlaneNodeKind entry" };
    expect(canonicalize(original)).not.toBe(canonicalize(tampered));
  });

  test("handles null, boolean, number, and empty structures", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(0)).toBe("0");
    expect(canonicalize({})).toBe("{}");
    expect(canonicalize([])).toBe("[]");
  });
});
