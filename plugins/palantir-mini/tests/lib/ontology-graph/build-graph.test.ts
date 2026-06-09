/**
 * tests/lib/ontology-graph/build-graph.test.ts
 * Tests for buildOntologyGraph (build-graph.ts — PR 2.14 sprint-091).
 *
 * Uses real fixtures under os.tmpdir() — no fs mocking, no module mocking,
 * no global git state mutation. Indexer-under-test (the orchestrator) walks
 * the temp directory and fans out to all concrete indexers
 * (ALL_INDEXER_NAMES). Each indexer gracefully tolerates an empty / partial
 * fixture tree (per their own spec), so the orchestrator returns one stats row
 * per indexer even when the fixture contains nothing meaningful.
 *
 * Sprint X3 PR 4/5. Plugin v6.11.0 → v6.12.0.
 *
 * NOTE on rule 25: fixtures live entirely under os.tmpdir() and are deleted
 * in afterAll. No tracked-project mutation. The git-history indexer is
 * always invoked with `skipPRs: true` (via the orchestrator's registry
 * shim) so no real `gh` invocations occur.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

import {
  buildOntologyGraph,
  ALL_INDEXER_NAMES,
  type IndexerName,
} from "../../../lib/ontology-graph/build-graph";

const execFileAsync = promisify(execFile);

// ─── Fixture lifecycle ───────────────────────────────────────────────────────

const createdDirs: string[] = [];

function mkTempProject(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `build-graph-test-${name}-`));
  createdDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const d of createdDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});

/**
 * Author a minimal fixture under `root` that exercises a handful of the 10
 * indexers without requiring all of them to produce nodes. Each indexer
 * tolerates missing inputs and returns `{ nodes: [], edges: [] }`.
 *
 * - BROWSE.md + INDEX.md so browse-index has something.
 * - `.claude/rules/01-test.md` so agents-rules has something.
 * - .git init so git-history can run a `git log` (default fixture has 0
 *   commits, which is still a successful 0-row outcome).
 */
async function seedMinimalFixture(root: string): Promise<void> {
  fs.writeFileSync(
    path.join(root, "BROWSE.md"),
    "# BROWSE\n\nSee INDEX.md.\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "INDEX.md"),
    "# INDEX\n\nFixture for build-graph.test.ts.\n",
    "utf8",
  );
  const rulesDir = path.join(root, ".claude", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, "01-test.md"),
    "---\nruleId: 1\nslug: test\nscope: project:fixture\nversion: 1.0.0\ninvariant: \"test fixture rule\"\nsupersededBy: null\ncrossRefs: []\nhookCitations: []\n---\n\n# Rule 1 — Test\n\nFixture body.\n",
    "utf8",
  );

  // Best-effort `git init` so git-history doesn't immediately reject. If git
  // is unavailable the orchestrator's error-containment path handles it.
  try {
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: root,
    });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: root });
    await execFileAsync(
      "git",
      ["commit", "--allow-empty", "-m", "initial fixture commit"],
      { cwd: root },
    );
  } catch {
    /* git unavailable — orchestrator's allSettled catches the error */
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildOntologyGraph", () => {
  test("default run: returns store + stats arrays of length 11", async () => {
    const root = mkTempProject("default-run");
    await seedMinimalFixture(root);

    const result = await buildOntologyGraph(root, {
      nowIso: "2026-05-13T00:00:00Z",
    });

    expect(result.store).toBeDefined();
    expect(result.stats.length).toBe(ALL_INDEXER_NAMES.length);

    // All canonical names present.
    const names = result.stats.map((s) => s.indexerName).sort();
    const expected = [...ALL_INDEXER_NAMES].sort();
    expect(names).toEqual(expected);

    // Each row has the required structural fields.
    for (const row of result.stats) {
      expect(typeof row.nodeCount).toBe("number");
      expect(typeof row.edgeCount).toBe("number");
      expect(typeof row.durationMs).toBe("number");
      expect(row.nodeCount).toBeGreaterThanOrEqual(0);
      expect(row.edgeCount).toBeGreaterThanOrEqual(0);
      expect(row.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  test("opts.skip filters indexers (events + git-history dropped → 2 fewer rows)", async () => {
    const root = mkTempProject("skip-filter");
    await seedMinimalFixture(root);

    const skip: ReadonlyArray<IndexerName> = ["events", "git-history"];
    const result = await buildOntologyGraph(root, {
      skip,
      nowIso: "2026-05-13T00:00:00Z",
    });

    expect(result.stats.length).toBe(ALL_INDEXER_NAMES.length - 2);
    const names = result.stats.map((s) => s.indexerName);
    expect(names).not.toContain("events");
    expect(names).not.toContain("git-history");
    // Spot check that two NON-skipped indexers ARE present.
    expect(names).toContain("browse-index");
    expect(names).toContain("agents-rules");
  });

  test("per-indexer error containment: other indexers still run when one is targeted at a broken root", async () => {
    // Use indexers: ["git-history", "browse-index"] over a NON-git directory
    // (no .git, no BROWSE/INDEX). The `git-history` indexer may either return
    // a 0-row success (some git versions report no-repo as 0 commits) or
    // reject. Either branch is acceptable; what matters is that `browse-index`
    // is still present in the stats with no thrown error from the orchestrator.
    const root = mkTempProject("error-containment");
    // Deliberately do NOT seed BROWSE/INDEX or git init — minimal empty tree.

    const result = await buildOntologyGraph(root, {
      indexers: ["git-history", "browse-index"],
      nowIso: "2026-05-13T00:00:00Z",
    });

    expect(result.stats.length).toBe(2);

    // browse-index ALWAYS present and never throws on an empty tree.
    const browseStat = result.stats.find((s) => s.indexerName === "browse-index");
    expect(browseStat).toBeDefined();
    expect(browseStat?.nodeCount).toBeGreaterThanOrEqual(0);
    expect(browseStat?.edgeCount).toBeGreaterThanOrEqual(0);
    // browse-index has no reason to error on an empty tree.
    expect(browseStat?.error).toBeUndefined();

    // git-history present (regardless of whether it errored).
    const gitStat = result.stats.find((s) => s.indexerName === "git-history");
    expect(gitStat).toBeDefined();
    // Either success (nodeCount could be 0 or more) or error string captured.
    // The orchestrator MUST NOT throw — both branches keep the call alive.
    if (gitStat?.error !== undefined) {
      expect(typeof gitStat.error).toBe("string");
      expect(gitStat.error.length).toBeGreaterThan(0);
    }
  });
});
