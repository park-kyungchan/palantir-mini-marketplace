/**
 * tests/lib/ontology-graph/indexers/source-files.test.ts
 * Tests for indexSourceFilesImports (source-files.ts — PR 2.10 sprint-087).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 * Sprint X2 closeout (5/5).
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexSourceFilesImports } from "../../../../lib/ontology-graph/indexers/source-files";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `source-files-test-${prefix}-${Date.now()}`);
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

// ─── Test 1: Headline fixture-tree AST walk ───────────────────────────────────
//
// Create 3 .ts fixtures under {tmpDir}/projectRoot/lib/:
//   a.ts — 3 imports (relative "./b", package "node:fs", relative type "./c")
//   b.ts — 1 import (relative type "./c")
//   c.ts — 0 imports
//
// Assert:
//   ≥3 SourceFile nodes (one per .ts file)
//   payload.fileExtension === ".ts" for all
//   payload.importCount matches AST-counted declarations (3, 1, 0)
//   ≥1 "imports" edge with value.confidence === 1.0 (the resolved "./b" import)
//   ≥1 "imports" edge with value.confidence === 0.5 (the "node:fs" package import)
//   All edges carry value.importSpecifier as a non-empty string

describe("indexSourceFilesImports", () => {
  test(
    "walks a fixture tree with .ts files and emits SourceFile nodes + imports edges via AST parse",
    async () => {
      const tmpDir = await makeTmpDir("fixture");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");
      const libDir = path.join(projectRoot, "lib");

      // a.ts: 3 imports (relative + package + relative type)
      await writeFile(
        path.join(libDir, "a.ts"),
        [
          `import { x } from "./b";`,
          `import * as fs from "node:fs";`,
          `import type { Y } from "./c";`,
          ``,
          `export const aValue = x + (fs ? 1 : 0) as unknown as Y;`,
        ].join("\n"),
      );

      // b.ts: 1 import (relative type)
      await writeFile(
        path.join(libDir, "b.ts"),
        [
          `import type { Z } from "./c";`,
          ``,
          `export const x: number = 1;`,
          `export type BLink = Z;`,
        ].join("\n"),
      );

      // c.ts: 0 imports
      await writeFile(
        path.join(libDir, "c.ts"),
        [
          `export type Y = string;`,
          `export type Z = number;`,
        ].join("\n"),
      );

      const result = await indexSourceFilesImports(projectRoot, { nowIso: NOW_ISO });

      // Node assertions: ≥3 SourceFile nodes
      const sourceFileNodes = result.nodes.filter((n) => n.kind === "SourceFile");

      // Filter to test-fixture only (defensive: ignore real $HOME walks)
      const testFixtureNodes = sourceFileNodes.filter((n) => {
        const v = n.value as { filePath: string };
        return v.filePath.includes(projectRoot);
      });
      expect(testFixtureNodes.length).toBe(3);

      // Per-file assertions: fileExtension + importCount
      const findByName = (name: string) =>
        testFixtureNodes.find((n) => {
          const v = n.value as { filePath: string };
          return v.filePath.endsWith(name);
        });

      const aNode = findByName("a.ts");
      expect(aNode).toBeDefined();
      const aValue = aNode?.value as {
        fileExtension: string;
        importCount: number;
        lastIndexed: string;
        projectRoot: string;
      };
      expect(aValue.fileExtension).toBe(".ts");
      expect(aValue.importCount).toBe(3);
      expect(aValue.lastIndexed).toBe(NOW_ISO);
      expect(aValue.projectRoot).toBe(projectRoot);

      const bNode = findByName("b.ts");
      expect(bNode).toBeDefined();
      const bValue = bNode?.value as { fileExtension: string; importCount: number };
      expect(bValue.fileExtension).toBe(".ts");
      expect(bValue.importCount).toBe(1);

      const cNode = findByName("c.ts");
      expect(cNode).toBeDefined();
      const cValue = cNode?.value as { fileExtension: string; importCount: number };
      expect(cValue.fileExtension).toBe(".ts");
      expect(cValue.importCount).toBe(0);

      // Edge assertions
      const importsEdges = result.edges.filter((e) => e.kind === "imports");

      // Filter to test-fixture only
      const testFixtureEdges = importsEdges.filter((e) => {
        // fromRid corresponds to one of our fixture file NodeRids
        return testFixtureNodes.some((n) => n.rid === e.fromRid);
      });

      // Total imports across fixture: 3 + 1 + 0 = 4
      expect(testFixtureEdges.length).toBe(4);

      // At least one edge with confidence 1.0 (the resolved "./b" or "./c")
      const resolvedEdges = testFixtureEdges.filter((e) => {
        const v = e.value as { confidence: number };
        return v.confidence === 1.0;
      });
      expect(resolvedEdges.length).toBeGreaterThanOrEqual(1);

      // At least one edge with confidence 0.5 (the "node:fs" package import)
      const unresolvedEdges = testFixtureEdges.filter((e) => {
        const v = e.value as { confidence: number };
        return v.confidence === 0.5;
      });
      expect(unresolvedEdges.length).toBeGreaterThanOrEqual(1);

      // All edges carry value.importSpecifier as a non-empty string
      for (const e of testFixtureEdges) {
        const v = e.value as { importSpecifier: string };
        expect(typeof v.importSpecifier).toBe("string");
        expect(v.importSpecifier.length).toBeGreaterThan(0);
      }

      // The "node:fs" edge specifically has confidence 0.5
      const nodeFsEdge = testFixtureEdges.find((e) => {
        const v = e.value as { importSpecifier: string };
        return v.importSpecifier === "node:fs";
      });
      expect(nodeFsEdge).toBeDefined();
      const nodeFsValue = nodeFsEdge?.value as { confidence: number };
      expect(nodeFsValue.confidence).toBe(0.5);

      // The "./b" edge specifically has confidence 1.0
      const relativeBEdge = testFixtureEdges.find((e) => {
        const v = e.value as { importSpecifier: string };
        return v.importSpecifier === "./b";
      });
      expect(relativeBEdge).toBeDefined();
      const relativeBValue = relativeBEdge?.value as {
        confidence: number;
        resolvedPath?: string;
      };
      expect(relativeBValue.confidence).toBe(1.0);
      expect(relativeBValue.resolvedPath).toBeDefined();
      expect(relativeBValue.resolvedPath?.endsWith("b.ts")).toBe(true);

      // Total non-zero
      expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no .ts files. Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no .ts files", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result: Awaited<ReturnType<typeof indexSourceFilesImports>> | undefined;
    let threw = false;

    try {
      result = await indexSourceFilesImports(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: opts.maxFiles cap respected ───────────────────────────────────
  //
  // Create 5 .ts fixture files under lib/. Call with maxFiles=2.
  // Assert: exactly 2 SourceFile nodes (alphabetically: five.ts, four.ts — sort comes first).

  test("respects opts.maxFiles cap when fixture exceeds the cap", async () => {
    const tmpDir = await makeTmpDir("cap");
    tmpDirs.push(tmpDir);

    const projectRoot = path.join(tmpDir, "projectRoot");
    const libDir = path.join(projectRoot, "lib");

    for (const name of ["one.ts", "two.ts", "three.ts", "four.ts", "five.ts"]) {
      await writeFile(
        path.join(libDir, name),
        `export const v = 1;`,
      );
    }

    const result = await indexSourceFilesImports(projectRoot, {
      nowIso: NOW_ISO,
      maxFiles: 2,
    });

    const sourceFileNodes = result.nodes.filter((n) => n.kind === "SourceFile");

    // Filter to test-fixture only
    const testFixtureNodes = sourceFileNodes.filter((n) => {
      const v = n.value as { filePath: string };
      return v.filePath.includes(projectRoot);
    });

    // Exactly 2 nodes — capped
    expect(testFixtureNodes.length).toBe(2);

    // Alphabetically first 2: five.ts + four.ts (sort places these before one/three/two)
    const fileNames = testFixtureNodes
      .map((n) => {
        const v = n.value as { filePath: string };
        return path.basename(v.filePath);
      })
      .sort();
    expect(fileNames).toEqual(["five.ts", "four.ts"]);
  });
});
