import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import { resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "..", "..");
const LOCAL_PLUGIN_SOURCE = "~/palantir-mini-marketplace/plugins/palantir-mini";
const UPSTREAM_MARKETPLACE_SOURCE = "github:park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini";
const RUNTIME_BOUNDARY_AUTHORITY = "~/.palantir-mini/core/runtime-boundary/runtime-boundary-contract.json";

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

/**
 * Expand a leading `~` in a `~`-form authority path to the real home dir.
 * The runtime-boundary contract itself is an out-of-repo, machine-local
 * artifact (Lead-approved design: the contract STAYS out-of-repo). Its
 * path in .ssot-authority.json is stored in canonical `~` form; resolve it
 * here purely to check for local presence before reading contract content.
 */
function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return resolve(os.homedir(), p.slice(2));
  }
  return p;
}

function resolvedRuntimeBoundaryContractPath(): string {
  const marker = loadSsotAuthority();
  return expandHome(String(marker.runtimeBoundaryAuthority));
}

function loadContract(): RuntimeBoundaryContract {
  const contractPath = resolvedRuntimeBoundaryContractPath();
  return JSON.parse(readFileSync(contractPath, "utf8")) as RuntimeBoundaryContract;
}

function loadSsotAuthority(): Record<string, unknown> {
  const markerPath = resolve(PLUGIN_ROOT, ".ssot-authority.json");
  return JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;
}

// The runtime-boundary contract is an out-of-repo, machine-local artifact
// (Lead-approved design: it STAYS out-of-repo). It will not exist on every
// machine that checks out this repo. Existence-gate the two tests whose
// assertions require reading its content; the third test (marker VALUES
// only) always runs since it is fully machine-neutral.
const runtimeBoundaryContractPresent = existsSync(resolvedRuntimeBoundaryContractPath());
if (!runtimeBoundaryContractPresent) {
  console.log(
    `[runtime-boundary.test] skipping contract-content assertions: ${resolvedRuntimeBoundaryContractPath()} is absent on this machine`,
  );
}

describe("runtime-neutral boundary contract", () => {
  test.skipIf(!runtimeBoundaryContractPresent)("keeps neutral core separate from runtime overlays", () => {
    const contract = loadContract();

    expect(contract.schemaVersion).toBe("palantir-mini/runtime-boundary-contract/v1");
    expect(contract.neutralCore.root).toBe(".palantir-mini/core");
    expect(contract.sourceAuthority.canonicalPluginSource).toBe(LOCAL_PLUGIN_SOURCE);
    expect(contract.sourceAuthority.upstreamPluginSource).toBe(UPSTREAM_MARKETPLACE_SOURCE);
    expect(contract.sourceAuthority.runtimeBoundaryContract).toBe(RUNTIME_BOUNDARY_AUTHORITY);
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

  test.skipIf(!runtimeBoundaryContractPresent)("records legacy runtime-specific plugin surfaces as migration debt", () => {
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
    expect(marker.runtimeBoundaryAuthority).toBe(RUNTIME_BOUNDARY_AUTHORITY);
    expect(String(marker.runtimeBoundaryAuthority)).not.toContain("/palantir-mini/.palantir-mini/");
    expect(marker.runtimeBoundaryAuthorityScope).toContain("runtime-neutral local checkout");
  });
});
