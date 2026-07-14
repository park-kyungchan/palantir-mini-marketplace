// palantir-mini — tests/integration/fresh-home.test.ts (sprint-061 A.W7)
//
// Fresh-home bootstrap integration test.
//
// Purpose: verifies that the plugin-resident runtime-overlay acts as a
// complete cold-start substitute when the external ~/.claude/rules/ and
// ~/.claude/research/ directories are unavailable.
//
// This test is the acceptance criterion for the Codex proposal §Migration
// Acceptance Criteria: "plugin-only cold-start works without external
// ~/.claude/rules/ being present."
//
// Scenario (rewritten under the a1-hermetic-plugin-tests slice — see git
// history for the prior real-home-MOVING version): every "HOME absent" case
// below runs against a disposable fake-HOME fixture (a fresh mkdtempSync()
// directory that never had anything in it), so this file never renames,
// moves, or otherwise mutates the developer's real ~/.claude/rules/ or
// ~/.claude/projects/**/memory. Three of the five exercised behaviors need a
// SEPARATE CHILD PROCESS rather than an in-process `process.env.HOME`
// override, for two distinct reasons: (1) lib/runtime-overlay/resolve-rule.ts
// and lib/runtime-overlay/research-core-select.ts each cache HOME as a
// module-level constant at import time, so only a fresh process (spawned
// with the fixture HOME already set) sees it resolve against the fixture —
// see fresh-home-resolve-rule-subprocess.ts / fresh-home-research-anchor-
// subprocess.ts; (2) resolveResearchAnchor() also performs unconditional
// existsSync/readFileSync checks against <HOME>/.claude/research/<topic>/
// before its forcePlugin gate is evaluated, so even a correct HOME override
// must point at an empty fixture directory, never the real one.
//
// Authority: sprint-061 A.W7; plan ~/.claude/plans/inherited-discovering-quill.md §4.A.W7.
// Cross-ref: lib/runtime-overlay/resolve-rule.ts, research-core-select.ts.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { OVERLAY_RULES_DIR } from "../../lib/runtime-overlay/resolve-rule";
import { resolveSchemaPath } from "../../lib/runtime-overlay/schema-resolve";
import { resolveSharedCorePath } from "../../lib/runtime-overlay/shared-core-resolve";
import { resolvePalantirMiniRoot } from "../../lib/config/root";

describe("fresh-home bootstrap: plugin overlay substitutes for missing external dirs", () => {

  test("plugin overlay CORE.md is present and non-empty", () => {
    const corePath = path.join(OVERLAY_RULES_DIR, "CORE.md");
    expect(fs.existsSync(corePath)).toBe(true);
    const content = fs.readFileSync(corePath, "utf8");
    expect(content.trim().length).toBeGreaterThan(0);
    // CORE.md must mention rule IDs (sanity — "rule NN" pattern or "## Core Invariants" heading)
    expect(content).toMatch(/rule\s+\d+|Core Invariants/i);
  });

  test("resolveRule(27) resolves to plugin-overlay when external rules are absent from HOME", () => {
    // Fresh, EMPTY fake-HOME fixture — never the real ~/.claude/rules/. See the
    // header comment on fresh-home-resolve-rule-subprocess.ts for why this must
    // run in a genuinely separate process rather than an in-process
    // process.env.HOME override.
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fresh-home-fake-"));
    try {
      const helperPath = path.join(import.meta.dir, "fresh-home-resolve-rule-subprocess.ts");
      const proc = Bun.spawnSync(["bun", "run", helperPath, "27"], {
        env: { ...process.env, HOME: fakeHome },
        stdout: "pipe",
        stderr: "pipe",
      });

      const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
      expect(proc.exitCode, `subprocess stderr: ${stderr}`).toBe(0);

      const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
      const result = JSON.parse(stdout) as { body: string; source: string; filePath?: string };

      // fakeHome has no .claude/rules/ at all → external fallback misses, so
      // resolution falls through to the plugin-resident overlay.
      expect(result.source).toBe("plugin-overlay");
      expect(result.body.trim().length).toBeGreaterThan(0);
      // Rule 27 is cross-runtime-substrate; body should mention substrate.
      expect(result.body).toContain("cross-runtime");
      expect(result.filePath).toBeDefined();
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  test("resolveResearchAnchor can force plugin snapshot fallback", () => {
    // Fresh, EMPTY fake-HOME fixture — never the real ~/.claude/research/.
    // See the header comment on fresh-home-research-anchor-subprocess.ts for
    // why this must run in a genuinely separate process: research-core-select.ts
    // caches HOME at module load, AND resolveResearchAnchor() unconditionally
    // existsSync/readFileSync-checks <HOME>/.claude/research/<topic>/ before
    // the forcePlugin gate is evaluated.
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fresh-home-fake-"));
    try {
      const helperPath = path.join(import.meta.dir, "fresh-home-research-anchor-subprocess.ts");
      const proc = Bun.spawnSync(["bun", "run", helperPath, "harness species", "claude-code"], {
        env: { ...process.env, HOME: fakeHome, PALANTIR_MINI_PREFER_PLUGIN_RESEARCH: "1" },
        stdout: "pipe",
        stderr: "pipe",
      });

      const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
      expect(proc.exitCode, `subprocess stderr: ${stderr}`).toBe(0);

      const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
      const result = JSON.parse(stdout) as { source: string; files: { path: string }[] };

      expect(result.source).toBe("plugin-snapshot");
      expect(result.files.length).toBeGreaterThan(0);
      // At least one file should resolve inside the plugin tree.
      const pluginDir = path.join(
        resolvePalantirMiniRoot(),
        "runtime-overlay",
        "research-library",
        "claude-code",
      );
      for (const f of result.files) {
        expect(f.path.startsWith(pluginDir)).toBe(true);
      }
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  test("schema and shared-core resolvers are plugin-contained by default", async () => {
    const schema = await resolveSchemaPath();
    expect(schema.source).toBe("plugin-snapshot");
    expect(schema.resolvedPath).toContain("runtime-overlay/schemas-snapshot");
    expect(fs.existsSync(path.join(schema.resolvedPath, "src", "generated", "rule-registry.ts"))).toBe(true);

    const sharedCore = resolveSharedCorePath();
    expect(sharedCore.source).toBe("plugin-snapshot");
    expect(sharedCore.resolvedPath).toContain("runtime-overlay/ontology-shared-core");
    expect(fs.existsSync(path.join(sharedCore.resolvedPath, "index.ts"))).toBe(true);
  });

  test("memory dir stub is created when absent and bootstrap-home.sh exits 0", () => {
    // Fresh, EMPTY fake-HOME fixture. scripts/bootstrap-home.sh reads $HOME from
    // its OWN process env (`HOME_DIR="${HOME:?HOME must be set}"`), so
    // overriding `env.HOME` in the spawnSync call below redirects the whole
    // check — including the per-project memory stub it creates — into the
    // fixture; the real ~/.claude/projects/**/memory is never touched.
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fresh-home-fake-"));
    try {
      // Mirrors bootstrap-home.sh's own HOME_SLUG derivation (`tr '/' '-'`).
      const fakeHomeSlug = path.resolve(fakeHome).split(path.sep).join("-");
      const memoryDir = path.join(fakeHome, ".claude", "projects", fakeHomeSlug, "memory");

      const scriptPath = path.join(resolvePalantirMiniRoot(), "scripts", "bootstrap-home.sh");
      expect(fs.existsSync(scriptPath)).toBe(true);
      expect(fs.existsSync(memoryDir)).toBe(false);

      const proc = Bun.spawnSync(["sh", scriptPath], {
        env: { ...process.env, HOME: fakeHome },
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
      const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
      expect(proc.exitCode, `stdout: ${stdout}\nstderr: ${stderr}`).toBe(0);
      expect(stdout).toContain("bootstrap-home OK");
      // Stub should have been created under the fake home.
      expect(fs.existsSync(memoryDir)).toBe(true);
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

});
