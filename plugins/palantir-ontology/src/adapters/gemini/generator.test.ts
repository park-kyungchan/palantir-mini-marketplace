// Permanent regression for src/adapters/gemini/generator.ts (ledger row
// A640, validation-contract item 1: "The Gemini binding (native or
// neutral-transport) is generated output traceable to A610's registry, not
// hand-authored"; item 2: "If native packaging is not officially evidenced
// [for this marketplace], the binding ships a working neutral MCP/CLI
// transport AND an explicit unsupported-native record, with a test
// asserting the claim"; item 3: "Every Gemini capability claim traces to
// R210/official-runtime-refresh.md; any unknown cell stays unknown, never
// upgraded to supported"). Colocated (not under tests/adapters/**) because
// this row's exact write set does not include tests/adapters/** — only
// A610 holds it (decisions/w6-write-set-adjudication.md item 2).

import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { CAPABILITY_AREAS, CAPABILITY_REGISTRY, RUNTIME_IDS } from "../shared";
import { HEADER, NATIVE_PACKAGING_STATUS, generateGeminiBinding, generateGeminiBindingSource } from "./generator";
import { GEMINI_BINDING } from "./binding.generated";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "shared", "capability-registry.json");

describe("generateGeminiBindingSource: determinism", () => {
  test("two independent calls against the same source produce byte-identical output", () => {
    const first = generateGeminiBindingSource(REGISTRY_PATH);
    const second = generateGeminiBindingSource(REGISTRY_PATH);
    expect(first).toBe(second);
  });
});

describe("generateGeminiBindingSource: mandatory header", () => {
  test("output starts with the @generated / DO NOT EDIT header", () => {
    const output = generateGeminiBindingSource(REGISTRY_PATH);
    expect(output.startsWith(HEADER)).toBe(true);
    expect(HEADER).toContain("@generated");
    expect(HEADER).toContain("DO NOT EDIT");
  });
});

describe("GEMINI_BINDING: traceable to A610's registry, never hand-authored", () => {
  test("manifest provider facts match CAPABILITY_REGISTRY.profiles.gemini.provider exactly", () => {
    const provider = CAPABILITY_REGISTRY.profiles.gemini.provider;
    expect(GEMINI_BINDING.manifest.displayName).toBe(provider.displayName);
    expect(GEMINI_BINDING.manifest.manifestPath).toBe(provider.manifestPath);
    expect(GEMINI_BINDING.manifest.transports).toEqual([...provider.transports]);
    expect(GEMINI_BINDING.manifest.configPaths).toEqual([...provider.configPaths]);
  });

  test("every capability area's verdicts/citation match the registry fact exactly (deep equal, no invented field)", () => {
    const profile = CAPABILITY_REGISTRY.profiles.gemini;
    expect(GEMINI_BINDING.manifest.capabilities.length).toBe(CAPABILITY_AREAS.length);
    for (const summary of GEMINI_BINDING.manifest.capabilities) {
      const fact = profile.capabilities[summary.area as (typeof CAPABILITY_AREAS)[number]];
      expect(summary.verdicts).toEqual(fact.verdicts);
      expect(summary.citation).toBe(fact.citation);
    }
  });

  test("unsupportedFeatures/unknownFeatures match the registry's lists exactly (no addition, no omission)", () => {
    const profile = CAPABILITY_REGISTRY.profiles.gemini;
    expect([...GEMINI_BINDING.manifest.unsupportedFeatures].sort()).toEqual([...profile.unsupportedFeatures].sort());
    expect([...GEMINI_BINDING.manifest.unknownFeatures].sort()).toEqual([...profile.unknownFeatures].sort());
  });

  test('no capability area\'s primary/only verdict is upgraded to "supported" beyond what the registry records (UNKNOWN-is-not-PASS)', () => {
    const profile = CAPABILITY_REGISTRY.profiles.gemini;
    for (const summary of GEMINI_BINDING.manifest.capabilities) {
      const fact = profile.capabilities[summary.area as (typeof CAPABILITY_AREAS)[number]];
      for (const [key, verdict] of Object.entries(fact.verdicts)) {
        expect(summary.verdicts[key]).toBe(verdict);
      }
    }
  });

  test("registry's own gemini.unknownFeatures list is empty, and this binding does not invent one (UNKNOWN-is-not-PASS applies to absence too — no unknown is silently upgraded, and none is silently added)", () => {
    expect(CAPABILITY_REGISTRY.profiles.gemini.unknownFeatures).toEqual([]);
    expect(GEMINI_BINDING.manifest.unknownFeatures).toEqual([]);
  });

  test("sourceOfRecord matches the registry's sourceOfRecord (R210)", () => {
    expect(GEMINI_BINDING.sourceOfRecord).toBe(CAPABILITY_REGISTRY.sourceOfRecord);
  });

  test("registrySourceSha256 is a 64-hex-char sha256 of the on-disk capability-registry.json, reproducible via generateGeminiBinding", () => {
    const recomputed = generateGeminiBinding(REGISTRY_PATH);
    expect(GEMINI_BINDING.registrySourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(GEMINI_BINDING.registrySourceSha256).toBe(recomputed.registrySourceSha256);
  });

  test("tools use only RUNTIME_IDS in their runtime enum (no invented runtime)", () => {
    for (const tool of GEMINI_BINDING.tools) {
      expect(tool.inputSchema.properties.runtime?.enum).toEqual([...RUNTIME_IDS]);
    }
  });

  test("exactly one tool per CAPABILITY_AREAS entry, named queryCapability_<area>", () => {
    const names = GEMINI_BINDING.tools.map((t) => t.name).sort();
    const expected = CAPABILITY_AREAS.map((a) => `queryCapability_${a}`).sort();
    expect(names).toEqual(expected);
  });
});

describe('native packaging: unsupported-at-this-marketplace record, never a fabricated native-support claim (validation-contract item 2, "do not fabricate support")', () => {
  test("NATIVE_PACKAGING_STATUS is fixed unsupported with the neutral-mcp-cli transport mode", () => {
    expect(NATIVE_PACKAGING_STATUS.supported).toBe(false);
    expect(NATIVE_PACKAGING_STATUS.transportMode).toBe("neutral-mcp-cli");
    expect(NATIVE_PACKAGING_STATUS.note.length).toBeGreaterThan(0);
  });

  test("GEMINI_BINDING.manifest.nativePackaging carries the same unsupported record, traceable to the generator constant (not hand-edited separately)", () => {
    expect(GEMINI_BINDING.manifest.nativePackaging).toEqual(NATIVE_PACKAGING_STATUS);
  });

  test("the unsupported-native record is distinct from R210's own packagingManifest verdict for Gemini CLI in the abstract (that verdict stays 'supported', carried forward verbatim — this row's claim is about marketplace packaging, not about downgrading R210's own official-source fact)", () => {
    const packagingManifestFact = GEMINI_BINDING.manifest.capabilities.find((c) => c.area === "packagingManifest");
    expect(packagingManifestFact?.verdicts.primary).toBe("supported");
    expect(GEMINI_BINDING.manifest.nativePackaging.supported).toBe(false);
  });

  test("this marketplace ships no gemini-extension.json / .gemini-plugin/ convention at generation time (read-only repository scan, proving the unsupported claim rather than asserting it in prose)", () => {
    const marketplaceRoot = resolve(import.meta.dir, "..", "..", "..", "..", "..");
    const found = execSync(
      'find . -maxdepth 6 \\( -iname "gemini-extension.json" -o -iname ".gemini-plugin" \\) -print 2>/dev/null || true',
      { cwd: marketplaceRoot, encoding: "utf8" },
    ).trim();
    expect(found).toBe("");
  });

  test("the neutral MCP/CLI transport this row ships (the flat queryCapability_<area> tools) is non-empty — the fallback is a working transport, not a silent omission", () => {
    expect(GEMINI_BINDING.tools.length).toBe(CAPABILITY_AREAS.length);
    expect(GEMINI_BINDING.tools.length).toBeGreaterThan(0);
  });
});
