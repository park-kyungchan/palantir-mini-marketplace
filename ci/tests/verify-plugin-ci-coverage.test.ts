import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findUncoveredPluginRoots, loadAuthorizedRoots } from "../verify-plugin-ci-coverage";

const REPO_ROOT = resolve(import.meta.dir, "../..");

const SAMPLE_ROOTS = [
  { path: "plugins/palantir-mini", grounds: "legacy root" },
  { path: "plugins/palantir-ontology", grounds: "successor root" },
];

describe("plugin CI coverage guard", () => {
  test("(a) a workflow that mentions every authorized root is fully covered", () => {
    const workflowText = [
      "- name: Typecheck",
      "  run: cd plugins/palantir-mini && bun run typecheck",
      "- name: Ontology typecheck",
      "  run: cd plugins/palantir-ontology && bun run typecheck",
    ].join("\n");

    expect(findUncoveredPluginRoots(workflowText, SAMPLE_ROOTS)).toEqual([]);
  });

  test("(b) a workflow missing a plugin path reports it as uncovered", () => {
    const workflowText = ["- name: Typecheck", "  run: cd plugins/palantir-mini && bun run typecheck"].join("\n");

    expect(findUncoveredPluginRoots(workflowText, SAMPLE_ROOTS)).toEqual(["plugins/palantir-ontology"]);
  });

  test("(c) the real registry is fully covered by the real workflow (regression pin)", () => {
    const roots = loadAuthorizedRoots();
    const workflowText = readFileSync(
      resolve(REPO_ROOT, ".github", "workflows", "palantir-mini-integrity.yml"),
      "utf8",
    );

    expect(findUncoveredPluginRoots(workflowText, roots)).toEqual([]);
  });
});
