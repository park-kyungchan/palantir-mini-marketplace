// Permanent regression for tests/parity/gemini/inventory-shape.fixture.json
// (ledger row A640). Proves the Gemini-side parity seed is well-formed and
// traceable to the committed src/adapters/gemini/binding.generated.ts — not
// a 3-way parity proof (that is A650's job; see README.md). Mirrors
// tests/parity/codex/fixture.test.ts and tests/parity/claude/fixture.test.ts's
// exact pattern (A620/A630).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CAPABILITY_AREAS } from "../../../src/adapters/shared";
import { GEMINI_BINDING } from "../../../src/adapters/gemini";
import { buildGeminiInventoryShapeFixture } from "./generate-fixture";
import type { GeminiInventoryShapeFixture } from "./generate-fixture";

const FIXTURE_PATH = resolve(import.meta.dir, "inventory-shape.fixture.json");

describe("inventory-shape.fixture.json: on-disk content matches a fresh regeneration (drift-free)", () => {
  test("on-disk JSON equals buildGeminiInventoryShapeFixture() output, byte-for-byte after normalization", () => {
    const onDisk = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as GeminiInventoryShapeFixture;
    const recomputed = buildGeminiInventoryShapeFixture();
    expect(onDisk).toEqual(recomputed);
  });
});

describe("inventory-shape.fixture.json: structural well-formedness", () => {
  const fixture = buildGeminiInventoryShapeFixture();

  test('runtimeId is "gemini"', () => {
    expect(fixture.runtimeId).toBe("gemini");
  });

  test("capabilityAreas is exactly the sorted 8 CAPABILITY_AREAS, no more, no fewer", () => {
    expect(fixture.capabilityAreas).toEqual([...CAPABILITY_AREAS].sort());
  });

  test("toolNames is exactly one queryCapability_<area> per capability area, sorted", () => {
    expect(fixture.toolNames).toEqual(CAPABILITY_AREAS.map((a) => `queryCapability_${a}`).sort());
  });

  test("manifestFieldKeys matches GEMINI_BINDING.manifest's actual own key set", () => {
    expect(fixture.manifestFieldKeys).toEqual([...Object.keys(GEMINI_BINDING.manifest)].sort());
  });

  test("toolInputSchemaConvention matches every shipped tool's actual inputSchema convention", () => {
    for (const tool of GEMINI_BINDING.tools) {
      expect(tool.inputSchema.type).toBe(fixture.toolInputSchemaConvention.type);
      expect(tool.inputSchema.required).toEqual([...fixture.toolInputSchemaConvention.requiredKeys]);
      expect(tool.inputSchema.additionalProperties).toBe(fixture.toolInputSchemaConvention.additionalProperties);
    }
  });

  test("nativePackagingSupported is false, matching GEMINI_BINDING.manifest.nativePackaging.supported (this row's unsupported-native record, never fabricated)", () => {
    expect(fixture.nativePackagingSupported).toBe(false);
    expect(fixture.nativePackagingSupported).toBe(GEMINI_BINDING.manifest.nativePackaging.supported);
  });

  test("sourceOfRecord matches the committed binding's sourceOfRecord (R210)", () => {
    expect(fixture.sourceOfRecord).toBe(GEMINI_BINDING.sourceOfRecord);
  });
});
