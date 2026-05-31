import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
  type RuntimeId,
} from "../../core/contracts";

const PLUGIN_ROOT = join(import.meta.dir, "../..");

function readEvidence(runtime: RuntimeId): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(PLUGIN_ROOT, "contracts", "runtime-evidence", `${runtime}.json`), "utf8"),
  ) as Record<string, unknown>;
}

describe("runtime parity claim evidence", () => {
  test("keeps Codex as the only evidence-backed supported runtime", () => {
    const codex = readEvidence("codex");

    expect(codex.schemaVersion).toBe("palantir-mini/runtime-evidence/v1");
    expect(codex.runtime).toBe("codex");
    expect(codex.sourceAuthority).toBe("plugins/palantir-mini");
    expect(codex.evidenceRefs).toContain("hooks/codex-hooks.json");
    expect(codex.evidenceRefs).toContain("lib/codex/codex-hook-adapter.ts");

    for (const contract of WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY) {
      expect(contract.runtimeProjection.claude.support).toBe("unsupported");
      expect(contract.runtimeProjection.gemini.support).toBe("unsupported");
      if (contract.runtimeProjection.codex.support !== "unsupported") {
        expect(contract.runtimeProjection.codex.evidenceRefs).toContain(
          "contracts/runtime-evidence/codex.json",
        );
      }
    }
  });

  test("runtime parity verifier passes the checked-in contract inventory", () => {
    const result = spawnSync("bun", ["run", "scripts/verify-runtime-parity-claims.ts"], {
      cwd: PLUGIN_ROOT,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("runtime support claims are evidence-backed");
    expect(result.stderr).toBe("");
  });
});
