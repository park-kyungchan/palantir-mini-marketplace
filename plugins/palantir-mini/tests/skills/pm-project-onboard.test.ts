// palantir-mini — pm-project-onboard skill bootstrap tests (sprint-064 PR-6)
//
// Tests the runOnboardScaffold helper directly (lib/project-scope/onboard-scaffold.ts).
// The skill SKILL.md describes a Markdown procedure that calls this helper; we verify
// the helper's behavior to give deterministic coverage of the 4-file bootstrap contract.
//
// Test plan:
//   T1: fresh temp dir → all 4 files written
//   T2: re-invoking → all 4 files skipped (idempotent)
//   T3: project-scope.json has writableRoot + forbiddenPatterns + empty educationProjectScope fields
//   T4: ontology-index/00-bootstrap.json has 1 placeholder capability + writableRoot + forbiddenPatterns
//   T5: known-issues.json is []
//   T6: skill-ontology/skill-registry.json has empty contracts array
//   T7: partial pre-existing files → only missing files are written, existing ones skipped

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runOnboardScaffold } from "../../lib/project-scope/onboard-scaffold";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-onboard-test-"));
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pm-project-onboard skill bootstrap", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeTempProject();
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test("T1: in a fresh temp dir, after running the bootstrap, all 4 files exist", async () => {
    const result = await runOnboardScaffold({ projectRoot });

    const scopePath = path.join(projectRoot, ".palantir-mini", "project-scope.json");
    const bootstrapPath = path.join(
      projectRoot,
      ".palantir-mini",
      "ontology-index",
      "00-bootstrap.json",
    );
    const knownIssuesPath = path.join(projectRoot, ".palantir-mini", "known-issues.json");
    const skillRegistryPath = path.join(
      projectRoot,
      ".palantir-mini",
      "skill-ontology",
      "skill-registry.json",
    );

    expect(fs.existsSync(scopePath)).toBe(true);
    expect(fs.existsSync(bootstrapPath)).toBe(true);
    expect(fs.existsSync(knownIssuesPath)).toBe(true);
    expect(fs.existsSync(skillRegistryPath)).toBe(true);

    expect(result.filesWritten).toHaveLength(4);
    expect(result.filesSkipped).toHaveLength(0);
  });

  test("T2: existing files are NOT overwritten when invoked twice", async () => {
    await runOnboardScaffold({ projectRoot });

    // Mutate one file to detect overwrite
    const scopePath = path.join(projectRoot, ".palantir-mini", "project-scope.json");
    const original = fs.readFileSync(scopePath, "utf8");
    const mutated = original.replace('"declared"', '"mutated"');
    fs.writeFileSync(scopePath, mutated, "utf8");

    // Re-invoke — should not overwrite
    const result = await runOnboardScaffold({ projectRoot });

    expect(result.filesSkipped).toHaveLength(4);
    expect(result.filesWritten).toHaveLength(0);

    // Verify the mutated value survived
    const afterContent = fs.readFileSync(scopePath, "utf8");
    expect(afterContent).toContain('"mutated"');
  });

  test("T3: project-scope.json has writableRoot + forbiddenPatterns + empty educationProjectScope fields", async () => {
    await runOnboardScaffold({
      projectRoot,
      writableRoot: "packages/app",
      forbiddenPatterns: ["src/generated/**", "dist/**"],
    });

    const scopePath = path.join(projectRoot, ".palantir-mini", "project-scope.json");
    const scope = readJson(scopePath) as Record<string, unknown>;

    // Required identity fields
    expect(typeof scope["projectId"]).toBe("string");
    expect(scope["sourcePath"]).toBe(".palantir-mini/project-scope.json");

    // writableRoot from args
    expect(scope["writableRoot"]).toBe("packages/app");

    // forbiddenPatterns from args
    const fp = scope["forbiddenPatterns"] as string[];
    expect(fp).toContain("src/generated/**");
    expect(fp).toContain("dist/**");

    // domainAgents canonical defaults
    const da = scope["domainAgents"] as string[];
    expect(da).toContain("implementer");
    expect(da).toContain("project-implementer");

    // Education-domain fields are empty (no domain leakage)
    expect(scope["projectOntologyAxes"]).toEqual([]);
    expect(scope["surfaceMutationBoundaries"]).toEqual([]);
    expect(scope["seqDataLaneInventory"]).toEqual([]);
    expect(scope["pathMarkers"]).toEqual([]);

    // Redesign object present with required fields
    const redesign = scope["projectOntologyScopeRedesign"] as Record<string, unknown>;
    expect(typeof redesign["id"]).toBe("string");
    expect(typeof redesign["status"]).toBe("string");
    expect(typeof redesign["purpose"]).toBe("string");
    expect(Array.isArray(redesign["validationLadder"])).toBe(true);
  });

  test("T4: ontology-index/00-bootstrap.json has 1 placeholder capability + writableRoot + forbiddenPatterns", async () => {
    await runOnboardScaffold({
      projectRoot,
      writableRoot: ".",
      forbiddenPatterns: ["src/generated/**", "node_modules/**"],
    });

    const bootstrapPath = path.join(
      projectRoot,
      ".palantir-mini",
      "ontology-index",
      "00-bootstrap.json",
    );
    const bootstrap = readJson(bootstrapPath) as Record<string, unknown>;

    expect(bootstrap["writableRoot"]).toBe(".");

    const fp = bootstrap["forbiddenPatterns"] as string[];
    expect(fp).toContain("src/generated/**");
    expect(fp).toContain("node_modules/**");

    const caps = bootstrap["capabilities"] as Array<Record<string, unknown>>;
    expect(caps).toHaveLength(1);
    expect(typeof caps[0]!["id"]).toBe("string");
    expect(caps[0]!["status"]).toBe("placeholder");
  });

  test("T5: known-issues.json is []", async () => {
    await runOnboardScaffold({ projectRoot });

    const knownIssuesPath = path.join(projectRoot, ".palantir-mini", "known-issues.json");
    const issues = readJson(knownIssuesPath);

    expect(Array.isArray(issues)).toBe(true);
    expect((issues as unknown[]).length).toBe(0);
  });

  test("T6: skill-ontology/skill-registry.json has empty contracts array", async () => {
    await runOnboardScaffold({ projectRoot });

    const skillRegistryPath = path.join(
      projectRoot,
      ".palantir-mini",
      "skill-ontology",
      "skill-registry.json",
    );
    const registry = readJson(skillRegistryPath) as Record<string, unknown>;

    expect(Array.isArray(registry["contracts"])).toBe(true);
    expect((registry["contracts"] as unknown[]).length).toBe(0);
  });

  test("T7: partial pre-existing files → only missing files are written, existing ones skipped", async () => {
    // Pre-create 2 of the 4 files
    const pmDir = path.join(projectRoot, ".palantir-mini");
    fs.mkdirSync(pmDir, { recursive: true });
    fs.writeFileSync(path.join(pmDir, "known-issues.json"), '["pre-existing"]\n', "utf8");
    fs.mkdirSync(path.join(pmDir, "skill-ontology"), { recursive: true });
    fs.writeFileSync(
      path.join(pmDir, "skill-ontology", "skill-registry.json"),
      '{"contracts": ["pre-existing"]}\n',
      "utf8",
    );

    const result = await runOnboardScaffold({ projectRoot });

    expect(result.filesWritten).toHaveLength(2);
    expect(result.filesSkipped).toHaveLength(2);

    // The pre-existing files are preserved
    const issues = readJson(path.join(pmDir, "known-issues.json")) as unknown[];
    expect(issues).toEqual(["pre-existing"]);

    const registry = readJson(
      path.join(pmDir, "skill-ontology", "skill-registry.json"),
    ) as Record<string, unknown>;
    expect((registry["contracts"] as unknown[])).toEqual(["pre-existing"]);
  });
});
