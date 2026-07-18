// Permanent regression for tests/parity/codex/inventory-shape.fixture.json
// (ledger row A620). Proves the Codex-side parity seed is well-formed and
// traceable to the committed src/adapters/codex/binding.generated.ts — not
// a 3-way parity proof (that is A650's job; see README.md).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CAPABILITY_AREAS } from "../../../src/adapters/shared";
import { CODEX_BINDING } from "../../../src/adapters/codex";
import { buildCodexInventoryShapeFixture } from "./generate-fixture";
import type { CodexInventoryShapeFixture } from "./generate-fixture";

const FIXTURE_PATH = resolve(import.meta.dir, "inventory-shape.fixture.json");

describe("inventory-shape.fixture.json: on-disk content matches a fresh regeneration (drift-free)", () => {
  test("on-disk JSON equals buildCodexInventoryShapeFixture() output, byte-for-byte after normalization", () => {
    const onDisk = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as CodexInventoryShapeFixture;
    const recomputed = buildCodexInventoryShapeFixture();
    expect(onDisk).toEqual(recomputed);
  });
});

describe("inventory-shape.fixture.json: structural well-formedness", () => {
  const fixture = buildCodexInventoryShapeFixture();

  test("runtimeId is \"codex\"", () => {
    expect(fixture.runtimeId).toBe("codex");
  });

  test("capabilityAreas is exactly the sorted 8 CAPABILITY_AREAS, no more, no fewer", () => {
    expect(fixture.capabilityAreas).toEqual([...CAPABILITY_AREAS].sort());
  });

  test("toolNames is exactly one queryCapability_<area> per capability area, sorted", () => {
    expect(fixture.toolNames).toEqual(CAPABILITY_AREAS.map((a) => `queryCapability_${a}`).sort());
  });

  test("manifestFieldKeys matches CODEX_BINDING.manifest's actual own key set", () => {
    expect(fixture.manifestFieldKeys).toEqual([...Object.keys(CODEX_BINDING.manifest)].sort());
  });

  test("toolInputSchemaConvention matches every shipped tool's actual inputSchema convention", () => {
    for (const tool of CODEX_BINDING.tools) {
      expect(tool.inputSchema.type).toBe(fixture.toolInputSchemaConvention.type);
      expect(tool.inputSchema.required).toEqual([...fixture.toolInputSchemaConvention.requiredKeys]);
      expect(tool.inputSchema.additionalProperties).toBe(fixture.toolInputSchemaConvention.additionalProperties);
    }
  });

  test("sourceOfRecord matches the committed binding's sourceOfRecord (R210)", () => {
    expect(fixture.sourceOfRecord).toBe(CODEX_BINDING.sourceOfRecord);
  });
});
