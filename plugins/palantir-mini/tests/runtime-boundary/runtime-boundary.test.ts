import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "..", "..");
const LOCAL_PLUGIN_SOURCE = "/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini";
const UPSTREAM_MARKETPLACE_SOURCE = "github:park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini";

interface RuntimeBoundaryContract {
  schemaVersion: string;
  sourceAuthority: {
    canonicalPluginSource: string;
    upstreamPluginSource: string;
    runtimeBoundaryContract: string;
    codexInstallPath: string;
    inactiveRuntimeInstallPaths: string[];
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
  const marker = loadSsotAuthority();
  const contractPath = String(marker.runtimeBoundaryAuthority);
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
    expect(contract.sourceAuthority.canonicalPluginSource).toBe(LOCAL_PLUGIN_SOURCE);
    expect(contract.sourceAuthority.upstreamPluginSource).toBe(UPSTREAM_MARKETPLACE_SOURCE);
    expect(contract.sourceAuthority.runtimeBoundaryContract).toBe(
      "/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json",
    );
    expect(contract.sourceAuthority.codexInstallPath).toContain(
      "~/.codex/plugins/cache/palantir-mini-marketplace",
    );
    expect(contract.sourceAuthority.inactiveRuntimeInstallPaths).toContain(
      "~/.claude/plugins/cache/palantir-mini-marketplace/palantir-mini/<version>",
    );
    expect(contract.sourceAuthority.inactiveRuntimeInstallPaths).toContain("~/.gemini/extensions/palantir-mini");

    const overlays = new Map(contract.runtimeNativeOverlays.map((overlay) => [overlay.runtime, overlay]));
    expect(overlays.get("codex")?.ownedRoots).toContain("~/.codex/**");
    expect(overlays.has("claude")).toBe(false);
    expect(overlays.has("gemini")).toBe(false);

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

    expect(debtPaths).toContain("plugins/palantir-mini/lib/codex/**");
    expect(debtPaths).toContain("plugins/palantir-mini/lib/runtime/capability-matrix.ts");
    expect(debtPaths).toContain("plugins/palantir-mini/docs/CODEX_HOOK_ADAPTER.md");
    expect(debtPaths.some((debtPath) => debtPath.startsWith("palantir-mini/"))).toBe(false);
    expect(debtPaths.some((debtPath) => debtPath.startsWith(".claude/plugins/palantir-mini"))).toBe(false);

    for (const debt of contract.legacyMigrationDebt) {
      expect(debt.ownerAfterMigration).toMatch(/~\/\.(codex|claude|gemini)/);
      expect(debt.removalCondition.length).toBeGreaterThan(10);
    }
  });

  test("SSoT marker points runtimeBoundaryAuthority at the neutral root contract", () => {
    const marker = loadSsotAuthority();

    expect(marker.authority).toBe(LOCAL_PLUGIN_SOURCE);
    expect(marker.upstreamAuthority).toBe(UPSTREAM_MARKETPLACE_SOURCE);
    expect(marker.runtimeBoundaryAuthority).toBe(
      "/home/palantirkc/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json",
    );
    expect(String(marker.runtimeBoundaryAuthority)).not.toContain("/palantir-mini/.palantir-mini/");
    expect(marker.runtimeBoundaryAuthorityScope).toContain("runtime-neutral local checkout");
  });
});
