import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  classifyReleaseChangedSurfaces,
  collectChangedFiles,
} from "../../../lib/harness/release-evidence";

function git(project: string, args: string[]): string {
  return execFileSync("git", ["-C", project, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function commit(project: string, message: string): void {
  git(project, ["add", "."]);
  git(project, [
    "-c",
    "user.email=palantir-mini@example.invalid",
    "-c",
    "user.name=palantir-mini-test",
    "commit",
    "-m",
    message,
  ]);
}

function makeGitProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-release-evidence-"));
  git(project, ["init", "-q"]);
  fs.mkdirSync(path.join(project, "old", "agents"), { recursive: true });
  fs.writeFileSync(path.join(project, "old", "agents", "agent.md"), "agent\n");
  fs.writeFileSync(path.join(project, "README.md"), "readme\n");
  commit(project, "initial");
  return project;
}

describe("release evidence changed-file collection", () => {
  test("keeps pure renames in release-gate surface classification", () => {
    const project = makeGitProject();
    fs.mkdirSync(path.join(project, "palantir-mini", "agents"), { recursive: true });
    git(project, ["mv", "old/agents/agent.md", "palantir-mini/agents/agent.md"]);

    expect(collectChangedFiles(project)).toContain("palantir-mini/agents/agent.md");
  });

  test("keeps content-changing renames in release-gate surface classification", () => {
    const project = makeGitProject();
    fs.mkdirSync(path.join(project, "palantir-mini", "agents"), { recursive: true });
    git(project, ["mv", "old/agents/agent.md", "palantir-mini/agents/agent.md"]);
    fs.appendFileSync(path.join(project, "palantir-mini", "agents", "agent.md"), "changed\n");

    expect(collectChangedFiles(project)).toContain("palantir-mini/agents/agent.md");
  });

  test("classifies semantic consistency source changes as release-gated surface", () => {
    const surfaces = classifyReleaseChangedSurfaces([
      ".claude/plugins/palantir-mini/lib/semantic-consistency/resolver.ts",
    ]);

    expect(surfaces.map((surface) => surface.surface)).toContain("semantic-consistency");
    expect(surfaces.map((surface) => surface.surface)).toContain("contract");
    expect(surfaces.map((surface) => surface.surface)).toContain("governance");
  });
});
