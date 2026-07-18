// P550 S2: hash/count reconciliation (`src/migration/reconciliation.ts`).
// A1-012/MEM-012/X-010.

import { describe, expect, test } from "bun:test";
import { computeReconciliation, evaluateReconciliation } from "../../src/migration/reconciliation";

describe("computeReconciliation", () => {
  test("equal source/target collections reconcile to matching counts and hashes", () => {
    const items = [{ a: 1 }, { a: 2 }];
    const reconciliation = computeReconciliation(items, items);
    expect(reconciliation.expectedCount).toBe(2);
    expect(reconciliation.actualCount).toBe(2);
    expect(reconciliation.expectedHash).toBe(reconciliation.actualHash);
    expect(reconciliation.expectedHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("is a pure function: identical inputs always produce an identical result", () => {
    const items = [{ x: "one" }, { x: "two" }];
    const run1 = computeReconciliation(items, items);
    const run2 = computeReconciliation(items, items);
    expect(run2).toEqual(run1);
  });

  test("a reordered target collection produces a DIFFERENT hash (array order is semantic content)", () => {
    const source = [{ id: "a" }, { id: "b" }];
    const reordered = [{ id: "b" }, { id: "a" }];
    const reconciliation = computeReconciliation(source, reordered);
    expect(reconciliation.actualCount).toBe(reconciliation.expectedCount);
    expect(reconciliation.actualHash).not.toBe(reconciliation.expectedHash);
  });

  test("key-insertion order within an item does NOT affect the hash (canonicalization)", () => {
    const a = [{ x: 1, y: 2 }];
    const b = [{ y: 2, x: 1 }];
    expect(computeReconciliation(a, a).expectedHash).toBe(computeReconciliation(b, b).expectedHash);
  });
});

describe("evaluateReconciliation", () => {
  test("ok when counts and hashes both match", () => {
    const reconciliation = computeReconciliation([{ a: 1 }], [{ a: 1 }]);
    const result = evaluateReconciliation(reconciliation);
    expect(result.ok).toBe(true);
  });

  test("denies with RC-MIGRATION-COUNT-MISMATCH when counts differ", () => {
    const result = evaluateReconciliation({
      expectedCount: 2,
      actualCount: 1,
      expectedHash: "a".repeat(64),
      actualHash: "a".repeat(64),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-COUNT-MISMATCH");
  });

  test("denies with RC-MIGRATION-HASH-MISMATCH when counts match but hashes differ", () => {
    const result = evaluateReconciliation({
      expectedCount: 1,
      actualCount: 1,
      expectedHash: "a".repeat(64),
      actualHash: "b".repeat(64),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-HASH-MISMATCH");
  });

  test("count mismatch is reported before hash mismatch when both differ", () => {
    const result = evaluateReconciliation({
      expectedCount: 2,
      actualCount: 1,
      expectedHash: "a".repeat(64),
      actualHash: "b".repeat(64),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-COUNT-MISMATCH");
  });
});
