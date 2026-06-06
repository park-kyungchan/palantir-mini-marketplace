import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RuntimeAdapterContract, RuntimeId } from "../../core/contracts";
import { verifyRuntimeAdapterContracts } from "../../scripts/verify-runtime-adapter-contracts";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const RUNTIMES: readonly RuntimeId[] = ["claude", "codex", "gemini"];
const CODEX_HOOKS_PATH = join(PLUGIN_ROOT, "hooks", "codex-hooks.json");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function readContract(runtime: RuntimeId): RuntimeAdapterContract {
  return readJson<RuntimeAdapterContract>(
    join(PLUGIN_ROOT, "runtime-adapters", runtime, "contract.json"),
  );
}

describe("runtime adapter contracts", () => {
  test("declares one separated source contract per supported runtime family", () => {
    const contracts = RUNTIMES.map(readContract);

    expect(contracts.map((contract) => contract.runtime).sort()).toEqual(["claude", "codex", "gemini"]);
    for (const contract of contracts) {
      expect(contract.schemaVersion).toBe("palantir-mini/runtime-adapter-contract/v1");
      expect(contract.providerIdentityAuthority).toBe("metadata-only");
      expect(contract.sourceAuthority).toBe("plugins/palantir-mini");
      expect(contract.unsupportedParityClaimsForbidden).toBe(true);
    }
  });

  test("Codex contract matches the mounted hook registry and hotfix boundary", () => {
    const contract = readContract("codex");
    const codexHooks = readJson<{ hooks?: Record<string, unknown> }>(CODEX_HOOKS_PATH);

    expect(contract.support).toBe("adapter-native");
    expect(contract.packageSurface).toBe("codex-plugin");
    expect([...contract.mountedHookEvents].sort()).toEqual(Object.keys(codexHooks.hooks ?? {}).sort());
    expect(contract.mountedHookEvents).toContain("PreToolUse");
    expect(contract.unmountedHookEvents).toEqual([]);
    for (const event of contract.unmountedHookEvents) {
      expect(codexHooks.hooks?.[event]).toBeUndefined();
    }
    expect(contract.unsupportedSurfaceRefs).not.toContain(
      "codex:hook-event:PreToolUse:unmounted-until-opt-out-and-read-only-classification",
    );
    expect(contract.smokeEvidenceRefs).toEqual(
      expect.arrayContaining([
        "tests/runtime-boundary/codex-plugin-hooks.test.ts",
        "tests/integration/codex-skill-surface.test.ts",
      ]),
    );
  });

  test("Claude and Gemini remain explicit unsupported runtime gaps", () => {
    for (const runtime of ["claude", "gemini"] as const) {
      const contract = readContract(runtime);

      expect(contract.support).toBe("unsupported");
      expect(contract.packageSurface).toBe("absent");
      expect(contract.manifestRefs).toEqual([]);
      expect(contract.hookRegistryRefs).toEqual([]);
      expect(contract.adapterRefs).toEqual([]);
      expect(contract.smokeEvidenceRefs).toEqual([]);
      expect(contract.runtimeGapRefs.length).toBeGreaterThan(0);
      expect(contract.unsupportedSurfaceRefs.length).toBeGreaterThan(0);
    }
  });

  test("verification script enforces adapter separation and evidence bounds", () => {
    const result = verifyRuntimeAdapterContracts(PLUGIN_ROOT);

    expect(result.status).toBe("pass");
    expect(result.errors).toEqual([]);
    expect(result.contractCount).toBe(3);
  });
});
