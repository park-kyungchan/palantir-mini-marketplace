// Permanent regression for src/adapters/codex/drift-check.ts's coverage of
// the Codex binding artifact (ledger row A620, validation-contract item 1:
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
import { checkCodexBindingArtifact } from "./drift-check";
import { HEADER, generateCodexBindingSource } from "./generator";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "shared", "capability-registry.json");

describe("checkCodexBindingArtifact: capability-registry.json -> binding.generated.ts drift coverage", () => {
  test("on-disk content matching the regenerated output PASSES (header ok, drift ok)", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a620-generated-check-codex-binding-pass-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateCodexBindingSource(REGISTRY_PATH);
      writeFileSync(outputPath, generated, "utf8");

      const result = checkCodexBindingArtifact(outputPath, HEADER, () => generateCodexBindingSource(REGISTRY_PATH));

      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(true);
      expect(result.onDiskMissing).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a hand-edit (appended comment line) to the on-disk artifact FAILS drift check", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a620-generated-check-codex-binding-drift-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateCodexBindingSource(REGISTRY_PATH);
      writeFileSync(outputPath, `${generated}\n// hand-edited, not regenerated\n`, "utf8");

      const result = checkCodexBindingArtifact(outputPath, HEADER, () => generateCodexBindingSource(REGISTRY_PATH));

      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(false);
      expect(result.onDiskMissing).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a hand-edit that mutates a verdict value FAILS drift check (a semantic hand-edit is caught, not only a comment append)", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a620-generated-check-codex-binding-semantic-drift-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const generated = generateCodexBindingSource(REGISTRY_PATH);
      const tampered = generated.replace('"unknown"', '"supported"');
      expect(tampered).not.toBe(generated);
      writeFileSync(outputPath, tampered, "utf8");

      const result = checkCodexBindingArtifact(outputPath, HEADER, () => generateCodexBindingSource(REGISTRY_PATH));

      expect(result.driftOk).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a missing on-disk artifact is reported as onDiskMissing, not a false drift-pass", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a620-generated-check-codex-binding-missing-"));
    try {
      const outputPath = join(scratchDir, "binding.generated.ts");
      const result = checkCodexBindingArtifact(outputPath, HEADER, () => generateCodexBindingSource(REGISTRY_PATH));
      expect(result.onDiskMissing).toBe(true);
      expect(result.driftOk).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("the REAL committed src/adapters/codex/binding.generated.ts is currently drift-free (end-to-end proof against the actual tracked file, read-only)", () => {
    const realOutputPath = resolve(import.meta.dir, "binding.generated.ts");
    const result = checkCodexBindingArtifact(realOutputPath, HEADER, () => generateCodexBindingSource(REGISTRY_PATH));

    expect(result.headerOk).toBe(true);
    expect(result.driftOk).toBe(true);
    expect(result.onDiskMissing).toBe(false);
  });
});
