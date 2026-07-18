// P550 S2: id maps (`src/migration/id-map.ts`). A1-012/MEM-012/X-010.

import { describe, expect, test } from "bun:test";
import { buildIdMap, translateLegacyId } from "../../src/migration/id-map";

describe("buildIdMap", () => {
  test("accepts a well-formed bijective id map", () => {
    const result = buildIdMap([
      { legacyId: "legacy-1", successorId: "succ-1" },
      { legacyId: "legacy-2", successorId: "succ-2" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });

  test("accepts an empty id map", () => {
    const result = buildIdMap([]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  test("denies a duplicate legacyId", () => {
    const result = buildIdMap([
      { legacyId: "legacy-1", successorId: "succ-1" },
      { legacyId: "legacy-1", successorId: "succ-2" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail).toContain("duplicate legacyId");
    }
  });

  test("denies a duplicate successorId (a merge that would collapse two legacy records into one)", () => {
    const result = buildIdMap([
      { legacyId: "legacy-1", successorId: "succ-1" },
      { legacyId: "legacy-2", successorId: "succ-1" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail).toContain("duplicate successorId");
    }
  });
});

describe("translateLegacyId", () => {
  const idMap = [
    { legacyId: "legacy-1", successorId: "succ-1" },
    { legacyId: "legacy-2", successorId: "succ-2" },
  ];

  test("resolves a mapped legacy id to its successor id", () => {
    expect(translateLegacyId(idMap, "legacy-1")).toBe("succ-1");
  });

  test("returns undefined, never a fabricated id, for an unmapped legacy id (UNKNOWN-is-not-PASS)", () => {
    expect(translateLegacyId(idMap, "legacy-not-mapped")).toBeUndefined();
  });
});
