// palantir-mini v3.2.0 — session-start hook tests
// G6: live `git branch --show-current` resolution
// N3: previously untested hook — first coverage in v3.2.0

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import { liveBranch } from "../../hooks/session-start";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ss-${label}-`));
}

describe("liveBranch (G6)", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("lb"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("non-git cwd → null (advisory skip)", () => {
    expect(liveBranch(tmp)).toBeNull();
  });

  test("git repo on a fresh branch → branch name", () => {
    execSync("git init --quiet --initial-branch=main", { cwd: tmp });
    execSync('git config user.email "test@test"', { cwd: tmp });
    execSync('git config user.name "test"', { cwd: tmp });
    fs.writeFileSync(path.join(tmp, "README.md"), "x");
    execSync("git add -A && git commit --quiet -m init", { cwd: tmp, shell: "/bin/bash" } as never);
    execSync("git checkout --quiet -b feat/some-branch", { cwd: tmp });

    expect(liveBranch(tmp)).toBe("feat/some-branch");
  });

  test("detached HEAD → null (no current branch)", () => {
    execSync("git init --quiet --initial-branch=main", { cwd: tmp });
    execSync('git config user.email "test@test"', { cwd: tmp });
    execSync('git config user.name "test"', { cwd: tmp });
    fs.writeFileSync(path.join(tmp, "README.md"), "x");
    execSync("git add -A && git commit --quiet -m init", { cwd: tmp, shell: "/bin/bash" } as never);
    const sha = execSync("git rev-parse HEAD", { cwd: tmp, encoding: "utf8" }).trim();
    execSync(`git checkout --quiet ${sha}`, { cwd: tmp });

    // detached HEAD: `git branch --show-current` outputs empty → liveBranch returns null
    expect(liveBranch(tmp)).toBeNull();
  });

  test("nonexistent cwd → null (graceful)", () => {
    expect(liveBranch("/no/such/path")).toBeNull();
  });
});
