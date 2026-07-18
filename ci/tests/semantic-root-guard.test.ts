import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findUnauthorizedSemanticRootForks } from "../verify-no-semantic-root-fork";
import { findSemanticRootForks } from "../../plugins/palantir-mini/scripts/verify-no-semantic-root-fork";

const REPO_ROOT = resolve(import.meta.dir, "../..");

describe("repository-level semantic root guard", () => {
  test("(a) filtered check is green on the current marketplace layout", () => {
    expect(findUnauthorizedSemanticRootForks(REPO_ROOT)).toEqual([]);
  });

  test("(b) a synthetic third fork still fails through the filter", () => {
    const fixture = mkdtempSync(join(tmpdir(), "pm-guard-third-fork-"));
    // plugins/palantir-mini must exist or the legacy detector short-circuits
    // with a "canonical source missing" finding instead of scanning plugins/.
    mkdirSync(join(fixture, "plugins", "palantir-mini"), { recursive: true });
    mkdirSync(join(fixture, "plugins", "some-other-fork", "src"), { recursive: true });
    writeFileSync(join(fixture, "plugins", "some-other-fork", "src", "index.ts"), "export {};\n");

    const findings = findUnauthorizedSemanticRootForks(fixture);

    expect(findings.some((f) => f.reasonCode === "plugin_source_fork" && f.path === "plugins/some-other-fork")).toBe(
      true,
    );
  });

  test("(c) a synthetic root-level semantic entry still fails through the filter", () => {
    const fixture = mkdtempSync(join(tmpdir(), "pm-guard-root-entry-"));
    mkdirSync(join(fixture, "plugins", "palantir-mini"), { recursive: true });
    mkdirSync(join(fixture, "hooks"), { recursive: true });
    writeFileSync(join(fixture, "hooks", "some-hook.ts"), "export {};\n");

    const findings = findUnauthorizedSemanticRootForks(fixture);

    expect(findings.some((f) => f.reasonCode === "semantic_root_entry" && f.path === "hooks")).toBe(true);
  });

  test("(d) pins the raw legacy detector divergence: exactly one finding, plugins/palantir-ontology", () => {
    const findings = findSemanticRootForks(REPO_ROOT);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      reasonCode: "plugin_source_fork",
      path: "plugins/palantir-ontology",
    });
  });
});
