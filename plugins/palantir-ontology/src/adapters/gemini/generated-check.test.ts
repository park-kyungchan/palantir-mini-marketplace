// Permanent regression for src/adapters/gemini/drift-check.ts's coverage of
// the Gemini binding artifact (ledger row A640, validation-contract item 1:
// "generated:check detects a hand-edit (test evidence)"). Mirrors
// tests/adapters/generated-check-capability-index.test.ts's exact pattern
// (A610), relocated here because this row's exact write set does not
// include tests/adapters/** (decisions/w6-write-set-adjudication.md item 2
// grants it to A610 only) — see README.md's "Scope note" for why this
// reimplements generated-check.ts's checkArtifact locally instead of
// writing to the shared scripts/generated-check.ts.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkGeminiBindingArtifact } from "./drift-check";
import { HEADER, generateGeminiBindingSource } from "./generator";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "shared", "capability-registry.json");

describe("checkGeminiBindingArtifact: capability-registry.json -> binding.generated.ts drift coverage", () => {
  test("on-disk content matching the regenerated output PASSES (header ok, drift ok)", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a640-generated-check-gemini-binding-pass-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateGeminiBindingSource(REGISTRY_PATH);
      writeFileSync(outputPath, generated, "utf8");

      const result = checkGeminiBindingArtifact(outputPath, HEADER, () => generateGeminiBindingSource(REGISTRY_PATH));

      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(true);
      expect(result.onDiskMissing).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a hand-edit (appended comment line) to the on-disk artifact FAILS drift check", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a640-generated-check-gemini-binding-drift-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateGeminiBindingSource(REGISTRY_PATH);
      writeFileSync(outputPath, `${generated}\n// hand-edited, not regenerated\n`, "utf8");

      const result = checkGeminiBindingArtifact(outputPath, HEADER, () => generateGeminiBindingSource(REGISTRY_PATH));

      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(false);
      expect(result.onDiskMissing).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a hand-edit that mutates a verdict value FAILS drift check (a semantic hand-edit is caught, not only a comment append)", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a640-generated-check-gemini-binding-semantic-drift-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateGeminiBindingSource(REGISTRY_PATH);
      const tampered = generated.replace('"supported"', '"unsupported"');
      expect(tampered).not.toBe(generated);
      writeFileSync(outputPath, tampered, "utf8");

      const result = checkGeminiBindingArtifact(outputPath, HEADER, () => generateGeminiBindingSource(REGISTRY_PATH));

      expect(result.driftOk).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a hand-edit that flips the native-packaging record to a fabricated native-support claim FAILS drift check (the specific fabrication this row's mission forbids)", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a640-generated-check-gemini-binding-fabricated-native-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateGeminiBindingSource(REGISTRY_PATH);
      const tampered = generated.replace('"supported": false,\n      "transportMode": "neutral-mcp-cli"', '"supported": true,\n      "transportMode": "neutral-mcp-cli"');
      expect(tampered).not.toBe(generated);
      writeFileSync(outputPath, tampered, "utf8");

      const result = checkGeminiBindingArtifact(outputPath, HEADER, () => generateGeminiBindingSource(REGISTRY_PATH));

      expect(result.driftOk).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a missing on-disk artifact is reported as onDiskMissing, not a false drift-pass", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a640-generated-check-gemini-binding-missing-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const result = checkGeminiBindingArtifact(outputPath, HEADER, () => generateGeminiBindingSource(REGISTRY_PATH));
      expect(result.onDiskMissing).toBe(true);
      expect(result.driftOk).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("the REAL committed src/adapters/gemini/binding.generated.ts is currently drift-free (end-to-end proof against the actual tracked file, read-only)", () => {
    const realOutputPath = resolve(import.meta.dir, "binding.generated.ts");
    const result = checkGeminiBindingArtifact(realOutputPath, HEADER, () => generateGeminiBindingSource(REGISTRY_PATH));

    expect(result.headerOk).toBe(true);
    expect(result.driftOk).toBe(true);
    expect(result.onDiskMissing).toBe(false);
  });
});
