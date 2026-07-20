import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findDanglingCitations } from "../verify-workspace-citations";

function makeRepoFixture(): string {
  return mkdtempSync(join(tmpdir(), "pm-citations-repo-"));
}

function makeWorkspaceFixture(): string {
  return mkdtempSync(join(tmpdir(), "pm-citations-workspace-"));
}

describe("workspace citation guard", () => {
  test("(a) a citation that resolves against the campaign workspace is NOT dangling", () => {
    const repo = makeRepoFixture();
    mkdirSync(join(repo, "plugins", "demo-plugin", "src"), { recursive: true });
    writeFileSync(
      join(repo, "plugins", "demo-plugin", "src", "example.ts"),
      "// see `outputs/real-report.md` for evidence\n",
    );

    const workspace = makeWorkspaceFixture();
    mkdirSync(join(workspace, "outputs"), { recursive: true });
    writeFileSync(join(workspace, "outputs", "real-report.md"), "# real\n");

    const { dangling } = findDanglingCitations(workspace, repo);

    expect(dangling).toEqual([]);
  });

  test("(b) a citation to a file missing from the campaign workspace IS dangling", () => {
    const repo = makeRepoFixture();
    mkdirSync(join(repo, "plugins", "demo-plugin", "src"), { recursive: true });
    writeFileSync(
      join(repo, "plugins", "demo-plugin", "src", "example.ts"),
      "// see `outputs/ghost-report.md` for evidence\n",
    );

    const workspace = makeWorkspaceFixture();
    mkdirSync(join(workspace, "outputs"), { recursive: true }); // dir exists, cited file does not

    const { dangling } = findDanglingCitations(workspace, repo);

    expect(dangling).toHaveLength(1);
    expect(dangling[0]).toMatchObject({
      citedPath: "outputs/ghost-report.md",
      line: 1,
      file: join("plugins", "demo-plugin", "src", "example.ts"),
    });
  });

  test("(c) a fully-qualified citation anchored under a different root is not treated as campaign-workspace-relative", () => {
    // Regression pin for a real false positive found in this repo:
    // plugins/palantir-mini/CHANGELOG.md cites
    // `~/.claude/research/palantir-vision/synthesis/<file>.md`, which ends in
    // a recognized segment name (`synthesis/`) but is anchored under a
    // completely different root. It must never be checked against the
    // campaign workspace.
    const repo = makeRepoFixture();
    mkdirSync(join(repo, "plugins", "demo-plugin"), { recursive: true });
    writeFileSync(
      join(repo, "plugins", "demo-plugin", "NOTES.md"),
      "See `~/.claude/research/palantir-vision/synthesis/2026-04-20-some-other-report.md` for background.\n",
    );

    const workspace = makeWorkspaceFixture(); // deliberately empty — no synthesis/ dir at all

    const { citations, dangling } = findDanglingCitations(workspace, repo);

    expect(citations).toEqual([]);
    expect(dangling).toEqual([]);
  });
});
