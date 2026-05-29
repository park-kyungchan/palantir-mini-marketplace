import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const DOC_PATH = join(PLUGIN_ROOT, "docs/PARALLEL_SPAWN_DISPATCH.md");

describe("PARALLEL_SPAWN_DISPATCH.md", () => {
  test("documents the ownerAgent field required by plan-task-dag-validate", () => {
    const content = readFileSync(DOC_PATH, "utf8");

    expect(content).toContain(
      "| id | runsAfter | parallelEligibleWith | ownerAgent | preReservedVersionSlot | worktreeIsolationRequired | riskTier |",
    );
    expect(content).toContain("| `ownerAgent` | yes |");
    expect(content).toContain("palantir-mini:hook-builder");
    expect(content).toContain("palantir-mini:plugin-maintainer");
    expect(content).toContain("palantir-mini:protocol-designer");
  });
});
