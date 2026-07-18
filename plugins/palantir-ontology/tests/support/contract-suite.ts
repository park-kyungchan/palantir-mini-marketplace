// Test-only shared suite runner: for one contracts/*.contract.json schema,
// registers a bun:test describe block asserting every positive fixture in
// tests/fixtures/<slug>/ validates and every negative fixture in
// tests/negative/<slug>/ is rejected (validation-contract item 2). Must be
// called synchronously at module top level (bun:test registers describe/test
// bodies at collection time, not at run time).

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { loadFixtures } from "./fixture-loader";
import { validateContract } from "./schema-validate";

const FIXTURES_ROOT = join(import.meta.dir, "..", "fixtures");
const NEGATIVE_ROOT = join(import.meta.dir, "..", "negative");

export function runContractSuite(slug: string, schema: any): void {
  describe(`${slug} contract`, () => {
    const positives = loadFixtures(join(FIXTURES_ROOT, slug));
    const negatives = loadFixtures(join(NEGATIVE_ROOT, slug));

    test("has at least 2 positive and 2 negative fixtures on disk", () => {
      expect(positives.length).toBeGreaterThanOrEqual(2);
      expect(negatives.length).toBeGreaterThanOrEqual(2);
    });

    for (const { file, data } of positives) {
      test(`accepts positive fixture ${file}`, () => {
        const result = validateContract(schema, data);
        expect(result.errors).toEqual([]);
        expect(result.valid).toBe(true);
      });
    }

    for (const { file, data } of negatives) {
      test(`rejects negative fixture ${file}`, () => {
        const result = validateContract(schema, data);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    }
  });
}
