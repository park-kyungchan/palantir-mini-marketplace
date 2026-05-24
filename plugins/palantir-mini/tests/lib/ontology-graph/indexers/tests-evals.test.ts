/**
 * tests/lib/ontology-graph/indexers/tests-evals.test.ts
 * Tests for indexTestsAndEvals (tests-evals.ts — PR 2.11 sprint-088).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 * Sprint X3 PR 1/5.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexTestsAndEvals } from "../../../../lib/ontology-graph/indexers/tests-evals";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `tests-evals-test-${prefix}-${Date.now()}`);
  await fs.promises.mkdir(base, { recursive: true });
  return base;
}

/** Writes a file at an absolute path, creating parent dirs as needed. */
async function writeFile(absPath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, content, "utf-8");
}

/** Deletes a temp directory after the test. */
async function rmDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

const NOW_ISO = "2026-05-13T00:00:00Z";

// ─── Fixture cleanup registry ─────────────────────────────────────────────────

const tmpDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tmpDirs.map((d) => rmDir(d)));
});

// ─── Test 1: Headline fixture-tree walk ───────────────────────────────────────
//
// Create 3 fixture test files + 1 source file under {tmpDir}/projectRoot/tests/:
//   tests/lib/a.test.ts   — `import { test } from "bun:test";`        (framework=bun, kind=unit)
//   tests/integration/b.test.ts — `import { describe } from "vitest";` (framework=vitest, kind=integration)
//   tests/e2e/c.spec.ts   — `import { test } from "@playwright/test";` (framework=playwright, kind=e2e)
//   lib/a.ts              — source file (resolved target for confidence=1.0 edge from a.test.ts)
//
// Assert:
//   exactly 3 Test nodes
//   payload.framework correctly assigns "bun" / "vitest" / "playwright"
//   payload.kind correctly assigns "unit" / "integration" / "e2e"
//   exactly 3 validates edges
//   ≥1 edge with value.confidence === 1.0 (a.test.ts → lib/a.ts)
//   ≥1 edge with value.confidence === 0.5 (integration/e2e — corresponding source missing)
//   all edges carry non-empty value.targetRelativePath

describe("indexTestsAndEvals", () => {
  test(
    "walks a fixture tree with test files and emits Test nodes + validates edges",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");

      // The resolved source file for a.test.ts (heuristic strips tests/ + .test.ts)
      await writeFile(
        path.join(projectRoot, "lib", "a.ts"),
        `export const aValue = 1;\n`,
      );

      // a.test.ts — bun framework, unit kind, resolves to lib/a.ts (confidence 1.0)
      await writeFile(
        path.join(projectRoot, "tests", "lib", "a.test.ts"),
        [
          `import { test, expect } from "bun:test";`,
          ``,
          `test("a passes", () => { expect(1).toBe(1); });`,
        ].join("\n"),
      );

      // b.test.ts — vitest framework, integration kind (path), unresolved target (confidence 0.5)
      await writeFile(
        path.join(projectRoot, "tests", "integration", "b.test.ts"),
        [
          `import { describe, expect, it } from "vitest";`,
          ``,
          `describe("b", () => { it("works", () => { expect(2).toBe(2); }); });`,
        ].join("\n"),
      );

      // c.spec.ts — playwright framework, e2e kind (path + framework), unresolved target (0.5)
      await writeFile(
        path.join(projectRoot, "tests", "e2e", "c.spec.ts"),
        [
          `import { test, expect } from "@playwright/test";`,
          ``,
          `test("c renders", async ({ page }) => { await page.goto("https://example.com"); });`,
        ].join("\n"),
      );

      const result = await indexTestsAndEvals(projectRoot, { nowIso: NOW_ISO });

      // Node assertions: filter to test-fixture only to ignore any cross-pollution
      const allTestNodes = result.nodes.filter((n) => n.kind === "Test");
      const testFixtureNodes = allTestNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });
      expect(testFixtureNodes.length).toBe(3);

      const findByName = (name: string) =>
        testFixtureNodes.find((n) => {
          const v = n.value as { filePath: string };
          return v.filePath.endsWith(name);
        });

      const aNode = findByName("a.test.ts");
      expect(aNode).toBeDefined();
      const aValue = aNode?.value as {
        framework: string;
        kind: string;
        lastIndexed: string;
        projectRoot: string;
      };
      expect(aValue.framework).toBe("bun");
      expect(aValue.kind).toBe("unit");
      expect(aValue.lastIndexed).toBe(NOW_ISO);
      expect(aValue.projectRoot).toBe(projectRoot);

      const bNode = findByName("b.test.ts");
      expect(bNode).toBeDefined();
      const bValue = bNode?.value as { framework: string; kind: string };
      expect(bValue.framework).toBe("vitest");
      expect(bValue.kind).toBe("integration");

      const cNode = findByName("c.spec.ts");
      expect(cNode).toBeDefined();
      const cValue = cNode?.value as { framework: string; kind: string };
      expect(cValue.framework).toBe("playwright");
      expect(cValue.kind).toBe("e2e");

      // Edge assertions
      const allValidatesEdges = result.edges.filter((e) => e.kind === "validates");
      const testFixtureEdges = allValidatesEdges.filter((e) => {
        return testFixtureNodes.some((n) => n.rid === e.fromRid);
      });

      // Exactly 3 validates edges (one per Test node)
      expect(testFixtureEdges.length).toBe(3);

      // ≥1 edge with confidence 1.0 (a.test.ts → lib/a.ts which exists)
      const resolvedEdges = testFixtureEdges.filter((e) => {
        const v = e.value as { confidence: number };
        return v.confidence === 1.0;
      });
      expect(resolvedEdges.length).toBeGreaterThanOrEqual(1);

      // ≥1 edge with confidence 0.5 (integration/e2e — sources missing)
      const unresolvedEdges = testFixtureEdges.filter((e) => {
        const v = e.value as { confidence: number };
        return v.confidence === 0.5;
      });
      expect(unresolvedEdges.length).toBeGreaterThanOrEqual(1);

      // All edges carry non-empty targetRelativePath
      for (const e of testFixtureEdges) {
        const v = e.value as { targetRelativePath: string };
        expect(typeof v.targetRelativePath).toBe("string");
        expect(v.targetRelativePath.length).toBeGreaterThan(0);
      }

      // The a.test.ts → lib/a.ts edge specifically has confidence 1.0 + correct path
      const aEdge = testFixtureEdges.find((e) => e.fromRid === aNode?.rid);
      expect(aEdge).toBeDefined();
      const aEdgeValue = aEdge?.value as { confidence: number; targetRelativePath: string };
      expect(aEdgeValue.confidence).toBe(1.0);
      expect(aEdgeValue.targetRelativePath).toBe("lib/a.ts");
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no test files and no eval files.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no test files and no eval files", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result: Awaited<ReturnType<typeof indexTestsAndEvals>> | undefined;
    let threw = false;

    try {
      result = await indexTestsAndEvals(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: AIPEvaluationSuite JSON parsing ───────────────────────────────
  //
  // Create 3 eval JSON files under {tmpDir}/projectRoot/.palantir-mini/aip-evals/:
  //   suite-A.json   — valid AIPEvaluationSuiteDeclaration shape (emits node)
  //   garbage.json   — JSON-valid but missing required fields (skipped)
  //   corrupt.json   — invalid JSON ("{") (skipped)
  //
  // Assert: exactly 1 AIPEvaluationSuite node; payload.suite.suiteId + name match;
  // no throw on garbage/corrupt.

  test(
    "walks AIPEvaluationSuiteDeclaration JSON files and emits AIPEvaluationSuite nodes",
    async () => {
      const tmpDir = await makeTmpDir("evals");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");
      const aipEvalsDir = path.join(projectRoot, ".palantir-mini", "aip-evals");

      // Valid eval suite — must match all 6 required-field shape checks
      const validSuite = {
        suiteId: "suite-rid-A",
        name: "Suite A — golden runs",
        target: {
          kind: "aip-agent",
          rid: "agent-rid-foo",
          versionRef: "v1.0.0",
        },
        testCaseIds: ["tc-1", "tc-2"],
        criteria: ["crit-correctness", "crit-latency"],
        evaluatorPolicy: {
          allowedDomains: ["code", "model"],
          requireHumanReviewForMutation: true,
          minimumPassingScore: 0.85,
        },
      };
      await writeFile(
        path.join(aipEvalsDir, "suite-A.json"),
        JSON.stringify(validSuite, null, 2),
      );

      // Garbage — JSON-valid but missing required fields (no `name`, no `target`)
      await writeFile(
        path.join(aipEvalsDir, "garbage.json"),
        JSON.stringify({ suiteId: "just-an-id" }),
      );

      // Corrupt — not valid JSON
      await writeFile(path.join(aipEvalsDir, "corrupt.json"), "{");

      const result = await indexTestsAndEvals(projectRoot, { nowIso: NOW_ISO });

      const allEvalNodes = result.nodes.filter((n) => n.kind === "AIPEvaluationSuite");
      const testFixtureEvalNodes = allEvalNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });

      // Exactly 1 valid eval node (suite-A only)
      expect(testFixtureEvalNodes.length).toBe(1);

      const evalNode = testFixtureEvalNodes[0];
      expect(evalNode).toBeDefined();
      const evalValue = evalNode?.value as {
        filePath: string;
        lastIndexed: string;
        suite: { suiteId: string; name: string };
      };
      expect(evalValue.filePath.endsWith("suite-A.json")).toBe(true);
      expect(evalValue.lastIndexed).toBe(NOW_ISO);
      expect(evalValue.suite.suiteId).toBe("suite-rid-A");
      expect(evalValue.suite.name).toBe("Suite A — golden runs");

      // No nodes emitted for garbage.json or corrupt.json
      const garbageNodes = testFixtureEvalNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.endsWith("garbage.json") || v.filePath.endsWith("corrupt.json");
      });
      expect(garbageNodes.length).toBe(0);

      // No tests in this fixture → 0 Test nodes
      const testNodesInFixture = result.nodes
        .filter((n) => n.kind === "Test")
        .filter((n) => {
          const v = n.value as { filePath: string };
          return v.filePath.includes(projectRoot);
        });
      expect(testNodesInFixture.length).toBe(0);
    },
  );
});
