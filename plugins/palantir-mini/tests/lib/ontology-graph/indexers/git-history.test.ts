/**
 * tests/lib/ontology-graph/indexers/git-history.test.ts
 * Tests for indexGitHistory (git-history.ts — PR 2.13 sprint-090).
 *
 * Uses real `git init` + `git commit --allow-empty` under os.tmpdir() — no fs
 * mocking, no global git state mutation. The test repos live entirely under
 * os.tmpdir() and are deleted in afterAll. Indexer-under-test runs read-only
 * `git log` invocations.
 *
 * All tests pass `skipPRs: true` — the `gh` CLI is not assumed available in the
 * test environment per spec §6. The `gh pr list` path is covered by manual smoke
 * (out of test scope per spec §6).
 *
 * Sprint X3 PR 3/5.
 *
 * NOTE on rule 25: tests author temporary git repos under os.tmpdir() that are
 * NOT this project's git tree. The indexer never invokes `git push` / `git commit` /
 * `git checkout` on a real project — only `git log` (read-only) + `gh --version`
 * (read-only probe) + `gh pr list` (read-only) under the explicit projectRoot.
 */

import { describe, expect, test, afterAll } from "bun:test";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

import { indexGitHistory } from "../../../../lib/ontology-graph/indexers/git-history";

const execFileAsync = promisify(execFile);

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(
    os.tmpdir(),
    `git-history-indexer-test-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await fs.promises.mkdir(base, { recursive: true });
  return base;
}

/** Deletes a temp directory after the test. */
async function rmDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

/**
 * Initialize a git repo at `projectRoot` and create N `--allow-empty` commits
 * with deterministic messages "commit-1" .. "commit-N". Sets local user.email +
 * user.name so commits don't fail when no global config exists. Returns the
 * commit SHAs in oldest-first order.
 */
async function initRepoWithCommits(
  projectRoot: string,
  commitCount: number,
): Promise<ReadonlyArray<string>> {
  await fs.promises.mkdir(projectRoot, { recursive: true });
  await execFileAsync("git", ["-C", projectRoot, "init", "-q"]);
  await execFileAsync("git", ["-C", projectRoot, "config", "user.email", "test@example.com"]);
  await execFileAsync("git", ["-C", projectRoot, "config", "user.name", "Test User"]);
  // Disable signing for tests
  await execFileAsync("git", ["-C", projectRoot, "config", "commit.gpgsign", "false"]);

  const shas: string[] = [];
  for (let i = 1; i <= commitCount; i += 1) {
    await execFileAsync(
      "git",
      [
        "-C",
        projectRoot,
        "commit",
        "--allow-empty",
        "-m",
        `commit-${i}`,
      ],
      { env: { ...process.env, GIT_AUTHOR_DATE: `2026-05-13T00:00:0${i}+00:00`, GIT_COMMITTER_DATE: `2026-05-13T00:00:0${i}+00:00` } },
    );
    const { stdout } = await execFileAsync("git", ["-C", projectRoot, "rev-parse", "HEAD"]);
    shas.push(stdout.trim());
  }
  return shas;
}

const NOW_ISO = "2026-05-13T00:00:00Z";

// ─── Fixture cleanup registry ─────────────────────────────────────────────────

const tmpDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tmpDirs.map((d) => rmDir(d)));
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("indexGitHistory", () => {
  // ─── Test 1: Headline — temp git repo with 3 commits ──────────────────────
  test(
    "walks a temp git repo and emits Commit nodes",
    async () => {
      const tmpDir = await makeTmpDir("headline");
      tmpDirs.push(tmpDir);
      const projectRoot = path.join(tmpDir, "projectRoot");
      const shas = await initRepoWithCommits(projectRoot, 3);

      const result = await indexGitHistory(projectRoot, {
        skipPRs: true,
        nowIso: NOW_ISO,
      });

      // Exactly 3 Commit nodes
      const commitNodes = result.nodes.filter((n) => n.kind === "Commit");
      expect(commitNodes.length).toBe(3);

      // Zero PullRequest nodes (skipPRs: true)
      const prNodes = result.nodes.filter((n) => n.kind === "PullRequest");
      expect(prNodes.length).toBe(0);

      // Zero correlatesWith edges (no PRs to join against)
      const corrEdges = result.edges.filter((e) => e.kind === "correlatesWith");
      expect(corrEdges.length).toBe(0);

      // Each commit node has well-formed payload
      for (const node of commitNodes) {
        const v = node.value as {
          projectRoot: string;
          lastIndexed: string;
          sha: string;
          authorEmail: string;
          committerDateIso: string;
          subject: string;
        };
        expect(v.projectRoot).toBe(projectRoot);
        expect(v.lastIndexed).toBe(NOW_ISO);
        expect(v.sha).toMatch(/^[0-9a-f]{40}$/);
        expect(v.authorEmail).toBe("test@example.com");
        expect(v.committerDateIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(v.subject).toMatch(/^commit-[1-3]$/);
      }

      // The set of node SHAs matches the set produced by initRepoWithCommits
      const nodeShas = new Set(commitNodes.map((n) => (n.value as { sha: string }).sha));
      for (const sha of shas) {
        expect(nodeShas.has(sha)).toBe(true);
      }
    },
  );

  // ─── Test 2: Degenerate — non-git directory ───────────────────────────────
  test(
    "gracefully handles a non-git directory",
    async () => {
      const tmpDir = await makeTmpDir("empty");
      tmpDirs.push(tmpDir);
      const projectRoot = path.join(tmpDir, "projectRoot");
      await fs.promises.mkdir(projectRoot, { recursive: true });

      let result: Awaited<ReturnType<typeof indexGitHistory>> | undefined;
      let threw = false;
      try {
        result = await indexGitHistory(projectRoot, { skipPRs: true });
      } catch {
        threw = true;
      }

      expect(threw).toBe(false);
      expect(result).toBeDefined();
      expect(result?.nodes.length).toBe(0);
      expect(result?.edges.length).toBe(0);
    },
  );

  // ─── Test 3: maxCommits cap applied at git-log -n flag ────────────────────
  test(
    "respects opts.maxCommits cap",
    async () => {
      const tmpDir = await makeTmpDir("cap");
      tmpDirs.push(tmpDir);
      const projectRoot = path.join(tmpDir, "projectRoot");
      await initRepoWithCommits(projectRoot, 5);

      const result = await indexGitHistory(projectRoot, {
        maxCommits: 2,
        skipPRs: true,
        nowIso: NOW_ISO,
      });

      // Exactly 2 Commit nodes (cap applied at git log -n flag)
      const commitNodes = result.nodes.filter((n) => n.kind === "Commit");
      expect(commitNodes.length).toBe(2);

      // No PR nodes / edges (skipPRs: true)
      const prNodes = result.nodes.filter((n) => n.kind === "PullRequest");
      expect(prNodes.length).toBe(0);
      const corrEdges = result.edges.filter((e) => e.kind === "correlatesWith");
      expect(corrEdges.length).toBe(0);
    },
  );
});
