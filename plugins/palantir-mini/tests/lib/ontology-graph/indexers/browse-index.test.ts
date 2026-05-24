/**
 * tests/lib/ontology-graph/indexers/browse-index.test.ts
 * Tests for indexBrowseAndIndexDocs (browse-index.ts — PR 2.4 sprint-081).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexBrowseAndIndexDocs } from "../../../../lib/ontology-graph/indexers/browse-index";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `browse-index-test-${prefix}-${Date.now()}`);
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
// Create:
//   projectRoot/BROWSE.md          (routing table with one target row)
//   projectRoot/INDEX.md
//   projectRoot/subdir/BROWSE.md   (nested — should also be discovered)
//
// Assert:
//   ≥2 ProjectBrowseDoc nodes (top + nested)
//   ≥1 ProjectIndexDoc node
//   ≥1 "describes" edge (INDEX co-located with top BROWSE)
//   nodes.length + edges.length > 0

describe("indexBrowseAndIndexDocs", () => {
  test("walks a fixture tree with BROWSE.md + INDEX.md and emits typed nodes + at least one edge", async () => {
    const tmpDir = await makeTmpDir("fixture");
    tmpDirs.push(tmpDir);

    const projectRoot = path.join(tmpDir, "projectRoot");

    // Top-level BROWSE.md with a routing table row pointing to a real .md file
    const targetMdPath = path.join(projectRoot, "target.md");
    const browseContent = [
      "# BROWSE.md — project router",
      "",
      "| Question | Open |",
      "|---|---|",
      `| What is this? | target.md |`,
    ].join("\n");

    await writeFile(path.join(projectRoot, "BROWSE.md"), browseContent);
    await writeFile(path.join(projectRoot, "INDEX.md"), "# INDEX");
    await writeFile(targetMdPath, "# Target");
    await writeFile(path.join(projectRoot, "subdir", "BROWSE.md"), "# Subdir BROWSE");

    const result = await indexBrowseAndIndexDocs(projectRoot, { nowIso: NOW_ISO });

    // Node assertions
    const browseNodes = result.nodes.filter((n) => n.kind === "ProjectBrowseDoc");
    const indexNodes = result.nodes.filter((n) => n.kind === "ProjectIndexDoc");

    expect(browseNodes.length).toBeGreaterThanOrEqual(2); // top + nested subdir
    expect(indexNodes.length).toBeGreaterThanOrEqual(1);  // INDEX.md

    // Payload assertions on top BROWSE.md node
    const topBrowse = browseNodes.find((n) => {
      const v = n.value as { filePath: string };
      return v.filePath === path.join(projectRoot, "BROWSE.md");
    });
    expect(topBrowse).toBeDefined();
    const topBrowseValue = topBrowse?.value as { lastIndexed: string; projectRoot: string };
    expect(topBrowseValue.lastIndexed).toBe(NOW_ISO);
    expect(topBrowseValue.projectRoot).toBe(projectRoot);

    // Edge assertions
    const describesEdges = result.edges.filter((e) => e.kind === "describes");
    expect(describesEdges.length).toBeGreaterThanOrEqual(1);

    // Total non-zero
    expect(result.nodes.length + result.edges.length).toBeGreaterThan(0);
  });

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty directory with no BROWSE.md / INDEX.md.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with neither BROWSE.md nor INDEX.md", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const emptyDir = path.join(tmpDir, "empty");
    await fs.promises.mkdir(emptyDir, { recursive: true });

    let result: Awaited<ReturnType<typeof indexBrowseAndIndexDocs>> | undefined;
    let threw = false;

    try {
      result = await indexBrowseAndIndexDocs(emptyDir, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: excludeGlobs skips a subdirectory ─────────────────────────────
  //
  // Reuse the fixture from test 1 (re-created here for isolation).
  // Call with excludeGlobs: ["**/subdir/**"].
  // Assert: subdir/BROWSE.md node is absent from results.

  test("respects excludeGlobs to skip a subdirectory", async () => {
    const tmpDir = await makeTmpDir("exclude");
    tmpDirs.push(tmpDir);

    const projectRoot = path.join(tmpDir, "projectRoot");

    await writeFile(path.join(projectRoot, "BROWSE.md"), "# BROWSE");
    await writeFile(path.join(projectRoot, "INDEX.md"), "# INDEX");
    await writeFile(path.join(projectRoot, "subdir", "BROWSE.md"), "# Subdir BROWSE");

    const result = await indexBrowseAndIndexDocs(projectRoot, {
      nowIso: NOW_ISO,
      excludeGlobs: ["**/subdir/**"],
    });

    // All nodes in result
    const nodeFilePaths = result.nodes.map((n) => {
      const v = n.value as { filePath: string };
      return v.filePath;
    });

    // subdir/BROWSE.md must NOT be in results
    const subdirBrowsePath = path.join(projectRoot, "subdir", "BROWSE.md");
    expect(nodeFilePaths).not.toContain(subdirBrowsePath);

    // Top-level BROWSE.md should still be present
    const topBrowsePath = path.join(projectRoot, "BROWSE.md");
    expect(nodeFilePaths).toContain(topBrowsePath);
  });
});
