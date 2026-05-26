/**
 * sync-codex-adapter.test.ts
 *
 * Validates the sync-codex-adapter.ts script's dry-run output structure.
 * Does NOT write to ~/.codex/ — uses --dry-run + --target /tmp/fake-target.
 *
 * sprint-129 PR 6.2 — canonical plan v2 §4 row 6.2; PHASE 6 PR 2/7.
 */

import { describe, it, expect } from "bun:test";
import path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const SCRIPT = path.join(PLUGIN_ROOT, "scripts", "sync-codex-adapter.ts");

async function runScript(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(
    ["bun", "run", SCRIPT, ...args],
    {
      cwd: PLUGIN_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode: exitCode ?? 0 };
}

describe("sync-codex-adapter.ts --dry-run", () => {
  it("exits 0 on successful dry-run", async () => {
    const { exitCode } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(exitCode).toBe(0);
  });

  it("stdout contains AUTO-GENERATED header", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("AUTO-GENERATED");
  });

  it("stdout references hooks.json as source", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("hooks.json");
  });

  it("stdout references scripts/sync-codex-adapter.ts", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("sync-codex-adapter.ts");
  });

  it("stdout contains DO NOT EDIT BY HAND guard", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("DO NOT EDIT BY HAND");
  });

  it("stdout imports from claude-hook-adapter.ts (SSoT lib)", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("claude-hook-adapter.ts");
    expect(stdout).toContain("runCodexHookAdapterCli");
  });

  it("stdout contains shebang line", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout.startsWith("#!/usr/bin/env bun")).toBe(true);
  });

  it("stdout references plugin root as source authority", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("palantir-mini");
  });

  it("stderr contains [dry-run] note", async () => {
    const { stderr } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stderr).toContain("[dry-run]");
  });

  it("stdout references canonical plan v2 row 6.2", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("6.2");
  });

  it("stdout does not reintroduce the retired Claude plugin install path as source", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).not.toContain("~/.claude/plugins/palantir-mini/hooks/hooks.json");
  });

  it("stdout states the adapter boundary without copying workflow authority into Codex", async () => {
    const { stdout } = await runScript(["--dry-run", "--target", "/tmp/fake-codex-adapter.ts"]);
    expect(stdout).toContain("runtime-local adapters are protocol consumers, not workflow authorities");
  });
});

describe("sync-codex-adapter.ts input validation", () => {
  it("script file exists at expected path", async () => {
    const exists = await Bun.file(SCRIPT).exists();
    expect(exists).toBe(true);
  });

  it("hooks.json exists as SSoT source", async () => {
    const hooksPath = path.join(PLUGIN_ROOT, "hooks", "hooks.json");
    const exists = await Bun.file(hooksPath).exists();
    expect(exists).toBe(true);
  });

  it(".ssot-authority.json exists (PR 6.1 precondition)", async () => {
    const markerPath = path.join(PLUGIN_ROOT, ".ssot-authority.json");
    const exists = await Bun.file(markerPath).exists();
    expect(exists).toBe(true);
  });

  it("script source does not name the retired Claude plugin install path as SSoT", async () => {
    const source = await Bun.file(SCRIPT).text();
    expect(source).not.toContain("~/.claude/plugins/palantir-mini/hooks/hooks.json");
    expect(source).toContain("shared private marketplace plugin hook registry");
  });
});
