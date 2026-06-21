// palantir-mini — shared gitHeadSha resolver (lineage atopWhich anchor).
// The events.jsonl 5-dim `atopWhich` MUST be a commit SHA. gitHeadSha resolves it
// via `git rev-parse HEAD` (packed-refs-safe), or returns "no-git" on any failure.

import { test, expect, describe, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { gitHeadSha } from "../../../lib/git/head-sha";

const tmpRoots: string[] = [];

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

/** A real throwaway git repo with one commit; returns its root dir. */
function initGitRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-head-sha-repo-"));
  tmpRoots.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "t@t.test");
  git(root, "config", "user.name", "test");
  fs.writeFileSync(path.join(root, "anchor.txt"), "v1\n");
  git(root, "add", "anchor.txt");
  git(root, "commit", "-q", "-m", "base");
  return root;
}

/** A plain temp dir that is NOT a git repo; returns its path. */
function nonRepoDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-head-sha-nogit-"));
  tmpRoots.push(dir);
  return dir;
}

describe("gitHeadSha", () => {
  test("a real git repo with a commit → a 40-hex commit SHA", () => {
    const root = initGitRepo();
    const sha = gitHeadSha(root);
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    // It is the genuine HEAD, not a symbolic ref name.
    expect(sha).toBe(git(root, "rev-parse", "HEAD"));
  });

  test("a non-repo dir → the \"no-git\" sentinel (never a symbolic ref)", () => {
    const dir = nonRepoDir();
    expect(gitHeadSha(dir)).toBe("no-git");
  });
});
