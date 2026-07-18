// Permanent regression for tests/parity/claude/inventory-shape.fixture.json
// (ledger row A630). Proves the Claude-side parity seed is well-formed and
// traceable to the committed src/adapters/claude/binding.generated.ts — not
// a 3-way parity proof (that is A650's job; see README.md). Mirrors
// tests/parity/codex/fixture.test.ts's exact pattern (A620).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CAPABILITY_AREAS } from "../../../src/adapters/shared";
import { CLAUDE_BINDING } from "../../../src/adapters/claude";
import { buildClaudeInventoryShapeFixture } from "./generate-fixture";
import type { ClaudeInventoryShapeFixture } from "./generate-fixture";

const FIXTURE_PATH = resolve(import.meta.dir, "inventory-shape.fixture.json");

describe("inventory-shape.fixture.json: on-disk content matches a fresh regeneration (drift-free)", () => {
  test("on-disk JSON equals buildClaudeInventoryShapeFixture() output, byte-for-byte after normalization", () => {
    const onDisk = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as ClaudeInventoryShapeFixture;
    const recomputed = buildClaudeInventoryShapeFixture();
    expect(onDisk).toEqual(recomputed);
  });
});

describe("inventory-shape.fixture.json: structural well-formedness", () => {
  const fixture = buildClaudeInventoryShapeFixture();

  test('runtimeId is "claude"', () => {
    expect(fixture.runtimeId).toBe("claude");
  });

  test("capabilityAreas is exactly the sorted 8 CAPABILITY_AREAS, no more, no fewer", () => {
    expect(fixture.capabilityAreas).toEqual([...CAPABILITY_AREAS].sort());
  });

  test("toolNames is exactly one queryCapability_<area> per capability area, sorted", () => {
    expect(fixture.toolNames).toEqual(CAPABILITY_AREAS.map((a) => `queryCapability_${a}`).sort());
  });

  test("manifestFieldKeys matches CLAUDE_BINDING.manifest's actual own key set", () => {
    expect(fixture.manifestFieldKeys).toEqual([...Object.keys(CLAUDE_BINDING.manifest)].sort());
  });

  test("toolInputSchemaConvention matches every shipped tool's actual inputSchema convention", () => {
    for (const tool of CLAUDE_BINDING.tools) {
      expect(tool.inputSchema.type).toBe(fixture.toolInputSchemaConvention.type);
      expect(tool.inputSchema.required).toEqual([...fixture.toolInputSchemaConvention.requiredKeys]);
      expect(tool.inputSchema.additionalProperties).toBe(fixture.toolInputSchemaConvention.additionalProperties);
    }
  });

  test("sourceOfRecord matches the committed binding's sourceOfRecord (R210)", () => {
    expect(fixture.sourceOfRecord).toBe(CLAUDE_BINDING.sourceOfRecord);
  });
});
