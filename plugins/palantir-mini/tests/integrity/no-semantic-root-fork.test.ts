import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findSemanticRootForks } from "../../scripts/verify-no-semantic-root-fork";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const PLUGIN_ROOT = resolve(import.meta.dir, "../..");

describe("semantic root fork detector", () => {
  test("accepts the current marketplace root layout", () => {
    expect(findSemanticRootForks(REPO_ROOT)).toEqual([]);
  });

  test("detects semantic surfaces created at repository root", () => {
    const fixture = mkdtempSync(join(tmpdir(), "pm-root-fork-"));
    mkdirSync(join(fixture, "plugins", "palantir-mini"), { recursive: true });
    mkdirSync(join(fixture, "hooks"), { recursive: true });
    writeFileSync(join(fixture, "hooks", "prompt-dtc-enforcement-gate.ts"), "export {};\n");

    const findings = findSemanticRootForks(fixture);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      path: "hooks",
      reasonCode: "semantic_root_entry",
    });
  });

  test("detector script passes the checked-in marketplace", () => {
    const result = spawnSync("bun", ["run", "scripts/verify-no-semantic-root-fork.ts"], {
      cwd: PLUGIN_ROOT,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("repository root is marketplace-only");
    expect(result.stderr).toBe("");
  });
});
