// Permanent regression for scripts/generated-check.ts's drift-detection
// coverage of the capability-index artifact (ledger row A610, validation-
// contract item 3: "generated:check covers the new artifact ... a hand-
// edit is detected and fails"). Converts A610 attempt-1's ad hoc drift-
// injection probe (outputs/a610-runtime-adapters.md "Validation contract —
// items proven", item 3) into a durable, re-runnable test file (W6
// write-set adjudication, decisions/w6-write-set-adjudication.md item 2).
//
// Uses `checkArtifact` (scripts/generated-check.ts's exported per-artifact
// checker) against a SCRATCH temp file, never the real committed
// scripts/generated/capability-index.generated.ts — the real artifact
// this test file's own repo sits next to is never written to, matching
// attempt-1's own restore-after-probe discipline but without needing a
// restore step at all.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkArtifact } from "../../scripts/generated-check";
import { generateCapabilityIndex, HEADER } from "../../scripts/generators/capability-index";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "..", "src", "adapters", "shared", "capability-registry.json");

describe("generated-check.ts: capability-index artifact drift coverage", () => {
  test("on-disk content matching the regenerated output PASSES (header ok, drift ok)", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a610-generated-check-capability-index-pass-"));
    try {
      const outputPath = join(scratchDir, "capability-index.generated.ts");
      const generated = generateCapabilityIndex(REGISTRY_PATH);
      writeFileSync(outputPath, generated, "utf8");

      const result = checkArtifact({
        name: "capability-index",
        outputPath,
        header: HEADER,
        regenerate: () => generateCapabilityIndex(REGISTRY_PATH),
      });

      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(true);
      expect(result.onDiskMissing).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a hand-edit (appended comment line) to the on-disk artifact FAILS drift check", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a610-generated-check-capability-index-drift-"));
    try {
      const outputPath = join(scratchDir, "capability-index.generated.ts");
      const generated = generateCapabilityIndex(REGISTRY_PATH);
      writeFileSync(outputPath, `${generated}\n// hand-edited, not regenerated\n`, "utf8");

      const result = checkArtifact({
        name: "capability-index",
        outputPath,
        header: HEADER,
        regenerate: () => generateCapabilityIndex(REGISTRY_PATH),
      });

      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(false);
      expect(result.onDiskMissing).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("a missing on-disk artifact is reported as onDiskMissing, not a false drift-pass", () => {
    const scratchDir = mkdtempSync(join(tmpdir(), "a610-generated-check-capability-index-missing-"));
    try {
      const outputPath = join(scratchDir, "capability-index.generated.ts");
      // Never written — regenerate() still succeeds, but readFileSync throws.
      const result = checkArtifact({
        name: "capability-index",
        outputPath,
        header: HEADER,
        regenerate: () => generateCapabilityIndex(REGISTRY_PATH),
      });

      expect(result.onDiskMissing).toBe(true);
      expect(result.driftOk).toBe(false);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  test("the REAL committed scripts/generated/capability-index.generated.ts is currently drift-free (end-to-end proof against the actual tracked file, read-only)", () => {
    const realOutputPath = resolve(import.meta.dir, "..", "..", "scripts", "generated", "capability-index.generated.ts");
    const result = checkArtifact({
      name: "capability-index",
      outputPath: realOutputPath,
      header: HEADER,
      regenerate: () => generateCapabilityIndex(REGISTRY_PATH),
    });

    expect(result.headerOk).toBe(true);
    expect(result.driftOk).toBe(true);
    expect(result.onDiskMissing).toBe(false);
  });
});
