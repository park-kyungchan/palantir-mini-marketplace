// P430 S1: production envelope-shape validator regression.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateEnvelopeShape } from "../../src/governance/envelope-validate";

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures", "mutation-authority");
const NEGATIVE_DIR = join(import.meta.dir, "..", "negative", "mutation-authority");

function loadJson(dir: string, file: string): unknown {
  return JSON.parse(readFileSync(join(dir, file), "utf8"));
}

describe("validateEnvelopeShape: positives", () => {
  for (const file of readdirSync(FIXTURES_DIR)) {
    test(`accepts ${file}`, () => {
      const result = validateEnvelopeShape(loadJson(FIXTURES_DIR, file));
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});

describe("validateEnvelopeShape: negatives", () => {
  for (const file of readdirSync(NEGATIVE_DIR)) {
    test(`rejects ${file}`, () => {
      const result = validateEnvelopeShape(loadJson(NEGATIVE_DIR, file));
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});

describe("validateEnvelopeShape: non-object inputs", () => {
  test("rejects undefined", () => {
    expect(validateEnvelopeShape(undefined).valid).toBe(false);
  });
  test("rejects null", () => {
    expect(validateEnvelopeShape(null).valid).toBe(false);
  });
  test("rejects a bare string handle (not yet resolved)", () => {
    expect(validateEnvelopeShape("some-nonce").valid).toBe(false);
  });
});
