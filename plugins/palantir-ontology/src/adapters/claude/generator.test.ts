// Permanent regression for src/adapters/claude/generator.ts (ledger row
// A630, validation-contract item 1: "The Claude binding is generated output
// traceable to A610's registry, not hand-authored"). Colocated (not under
// tests/adapters/**) because this row's exact write set does not include
// tests/adapters/** — only A610 holds it (decisions/
// w6-write-set-adjudication.md item 2), mirroring
// src/adapters/codex/generator.test.ts's exact pattern.

import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { CAPABILITY_AREAS, CAPABILITY_REGISTRY, RUNTIME_IDS } from "../shared";
import { HEADER, generateClaudeBinding, generateClaudeBindingSource } from "./generator";
import { CLAUDE_BINDING } from "./binding.generated";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "shared", "capability-registry.json");

describe("generateClaudeBindingSource: determinism", () => {
  test("two independent calls against the same source produce byte-identical output", () => {
    const first = generateClaudeBindingSource(REGISTRY_PATH);
    const second = generateClaudeBindingSource(REGISTRY_PATH);
    expect(first).toBe(second);
  });
});

describe("generateClaudeBindingSource: mandatory header", () => {
  test("output starts with the @generated / DO NOT EDIT header", () => {
    const output = generateClaudeBindingSource(REGISTRY_PATH);
    expect(output.startsWith(HEADER)).toBe(true);
    expect(HEADER).toContain("@generated");
    expect(HEADER).toContain("DO NOT EDIT");
  });
});

describe("CLAUDE_BINDING: traceable to A610's registry, never hand-authored", () => {
  test("manifest provider facts match CAPABILITY_REGISTRY.profiles.claude.provider exactly", () => {
    const provider = CAPABILITY_REGISTRY.profiles.claude.provider;
    expect(CLAUDE_BINDING.manifest.displayName).toBe(provider.displayName);
    expect(CLAUDE_BINDING.manifest.manifestPath).toBe(provider.manifestPath);
    expect(CLAUDE_BINDING.manifest.transports).toEqual([...provider.transports]);
    expect(CLAUDE_BINDING.manifest.configPaths).toEqual([...provider.configPaths]);
  });

  test("every capability area's verdicts/citation match the registry fact exactly (deep equal, no invented field)", () => {
    const profile = CAPABILITY_REGISTRY.profiles.claude;
    expect(CLAUDE_BINDING.manifest.capabilities.length).toBe(CAPABILITY_AREAS.length);
    for (const summary of CLAUDE_BINDING.manifest.capabilities) {
      const fact = profile.capabilities[summary.area as (typeof CAPABILITY_AREAS)[number]];
      expect(summary.verdicts).toEqual(fact.verdicts);
      expect(summary.citation).toBe(fact.citation);
    }
  });

  test("unsupportedFeatures/unknownFeatures match the registry's lists exactly (no addition, no omission)", () => {
    const profile = CAPABILITY_REGISTRY.profiles.claude;
    expect([...CLAUDE_BINDING.manifest.unsupportedFeatures].sort()).toEqual([...profile.unsupportedFeatures].sort());
    expect([...CLAUDE_BINDING.manifest.unknownFeatures].sort()).toEqual([...profile.unknownFeatures].sort());
  });

  test("no capability area's primary/only verdict is upgraded to \"supported\" beyond what the registry records (UNKNOWN-is-not-PASS)", () => {
    const profile = CAPABILITY_REGISTRY.profiles.claude;
    for (const summary of CLAUDE_BINDING.manifest.capabilities) {
      const fact = profile.capabilities[summary.area as (typeof CAPABILITY_AREAS)[number]];
      for (const [key, verdict] of Object.entries(fact.verdicts)) {
        expect(summary.verdicts[key]).toBe(verdict);
      }
    }
  });

  test("sourceOfRecord matches the registry's sourceOfRecord (R210)", () => {
    expect(CLAUDE_BINDING.sourceOfRecord).toBe(CAPABILITY_REGISTRY.sourceOfRecord);
  });

  test("registrySourceSha256 is a 64-hex-char sha256 of the on-disk capability-registry.json, reproducible via generateClaudeBinding", () => {
    const recomputed = generateClaudeBinding(REGISTRY_PATH);
    expect(CLAUDE_BINDING.registrySourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(CLAUDE_BINDING.registrySourceSha256).toBe(recomputed.registrySourceSha256);
  });

  test("tools use only RUNTIME_IDS in their runtime enum (no invented runtime)", () => {
    for (const tool of CLAUDE_BINDING.tools) {
      expect(tool.inputSchema.properties.runtime?.enum).toEqual([...RUNTIME_IDS]);
    }
  });

  test("exactly one tool per CAPABILITY_AREAS entry, named queryCapability_<area>", () => {
    const names = CLAUDE_BINDING.tools.map((t) => t.name).sort();
    const expected = CAPABILITY_AREAS.map((a) => `queryCapability_${a}`).sort();
    expect(names).toEqual(expected);
  });
});
