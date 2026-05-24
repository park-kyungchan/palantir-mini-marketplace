import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "..", "..");
const PROJECT_ROOT = resolve(PLUGIN_ROOT, "..");

interface RuntimeBoundaryContract {
  schemaVersion: string;
  sourceAuthority: {
    canonicalPluginSource: string;
    runtimeBoundaryContract: string;
    claudeCompatibilityInstallPath: string;
    note: string;
  };
  neutralCore: {
    root: string;
    owns: string[];
    doesNotOwn: string[];
  };
  runtimeNativeOverlays: Array<{ runtime: string; ownedRoots: string[]; owns: string[] }>;
  legacyMigrationDebt: Array<{
    path: string;
    ownerAfterMigration: string;
    removalCondition: string;
  }>;
}

function loadContract(): RuntimeBoundaryContract {
  const contractPath = resolve(
    PROJECT_ROOT,
    ".palantir-mini/core/runtime-boundary/runtime-boundary-contract.json",
  );
  return JSON.parse(readFileSync(contractPath, "utf8")) as RuntimeBoundaryContract;
}

function loadSsotAuthority(): Record<string, unknown> {
  const markerPath = resolve(PLUGIN_ROOT, ".ssot-authority.json");
  return JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;
}

describe("runtime-neutral boundary contract", () => {
  test("keeps neutral core separate from runtime overlays", () => {
    const contract = loadContract();

    expect(contract.schemaVersion).toBe("palantir-mini/runtime-boundary-contract/v1");
    expect(contract.neutralCore.root).toBe(".palantir-mini/core");
    expect(contract.sourceAuthority.canonicalPluginSource).toBe("/home/palantirkc/palantir-mini");
    expect(contract.sourceAuthority.runtimeBoundaryContract).toBe(
      "/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json",
    );

    const overlays = new Map(contract.runtimeNativeOverlays.map((overlay) => [overlay.runtime, overlay]));
    expect(overlays.get("codex")?.ownedRoots).toContain("~/.codex/**");
    expect(overlays.get("claude")?.ownedRoots).toContain("~/.claude/**");

    for (const ownedConcept of contract.neutralCore.owns) {
      expect(ownedConcept).not.toMatch(/codex|claude/i);
    }

    for (const overlay of contract.runtimeNativeOverlays) {
      expect(overlay.owns.length).toBeGreaterThan(0);
      for (const ownedRoot of overlay.ownedRoots) {
        expect(ownedRoot).not.toStartWith(".palantir-mini/core");
      }
    }
  });

  test("records legacy runtime-specific plugin surfaces as migration debt", () => {
    const contract = loadContract();
    const debtPaths = contract.legacyMigrationDebt.map((entry) => entry.path);

    expect(debtPaths).toContain("palantir-mini/lib/codex/**");
    expect(debtPaths).toContain("palantir-mini/lib/runtime/capability-matrix.ts");
    expect(debtPaths).toContain("palantir-mini/docs/CODEX_HOOK_ADAPTER.md");
    expect(debtPaths.some((debtPath) => debtPath.startsWith(".claude/plugins/palantir-mini"))).toBe(false);

    for (const debt of contract.legacyMigrationDebt) {
      expect(debt.ownerAfterMigration).toMatch(/^~\/\.codex|^~\/\.claude/);
      expect(debt.removalCondition.length).toBeGreaterThan(10);
    }
  });

  test("SSoT marker points runtimeBoundaryAuthority at the neutral root contract", () => {
    const marker = loadSsotAuthority();

    expect(marker.authority).toBe("/home/palantirkc/palantir-mini");
    expect(marker.runtimeBoundaryAuthority).toBe(
      "/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json",
    );
    expect(String(marker.runtimeBoundaryAuthority)).not.toContain("/palantir-mini/.palantir-mini/");
    expect(marker.runtimeBoundaryAuthorityScope).toContain("canonical plugin workflow source remains");
  });
});
