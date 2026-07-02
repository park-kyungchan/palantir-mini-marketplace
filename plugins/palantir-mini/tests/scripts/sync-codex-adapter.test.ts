/**
 * sync-codex-adapter.test.ts
 *
 * CI coverage for scripts/sync-codex-adapter.ts, the generator that
 * regenerates the out-of-repo Codex shim
 * (~/.codex/hooks/palantir-mini-codex-hook-adapter.ts) from the shared
 * hooks/hooks.json SSoT. Previously manual-only and unexercised by CI, so
 * hooks.json structure drift that breaks the generator — or a deployed
 * shim that has drifted from what the generator would now produce — went
 * undetected.
 *
 * Lane 1 (always runs): generator invariants exercised via --dry-run
 * against a scratch target, plus a failure-path fixture with invalid
 * hooks.json.
 * Lane 2 (existence-gated, repo precedent — see
 * tests/bridge/handlers/semantic-drift-audit.test.ts and
 * tests/runtime-boundary/runtime-boundary.test.ts for the
 * `test.skipIf(!xPresent)` idiom): compares the live deployed shim against
 * what the generator would produce today, skipped when no shim is deployed
 * on this machine (true in CI and in sandboxes).
 *
 * sprint-129 PR 6.2 follow-up — H7 CI coverage gap closure.
 */

import { describe, test, expect } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const SCRIPT = path.join(PLUGIN_ROOT, "scripts", "sync-codex-adapter.ts");
const HOOKS_JSON_PATH = path.join(PLUGIN_ROOT, "hooks", "hooks.json");

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runScript(
  args: string[],
  cwd: string = PLUGIN_ROOT,
  scriptPath: string = SCRIPT,
): Promise<RunResult> {
  const proc = Bun.spawn(["bun", scriptPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode: exitCode ?? 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// Lane 1 — CI-safe generator invariants
// ────────────────────────────────────────────────────────────────────────────

describe("sync-codex-adapter.ts --dry-run (Lane 1: CI-safe generator invariants)", () => {
  test("exits 0 and writes nothing to --target", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-"));
    const target = path.join(dir, "adapter.ts");
    try {
      const { exitCode, stderr } = await runScript(["--dry-run", "--target", target]);
      expect(exitCode).toBe(0);
      // Dry-run must print to stdout, never write the target file.
      // Evidence: scripts/sync-codex-adapter.ts:176-183 (`if (dryRun) { process.stdout.write(content); ...; return; }`
      // returns before the write-to-target block at :185-208).
      expect(existsSync(target)).toBe(false);

      // Dry-run mode must announce itself on stderr (stdout is reserved for
      // the generated content only, so the human-readable status note is
      // routed to stderr instead).
      // Evidence: scripts/sync-codex-adapter.ts:179-181
      // (`console.error(\`[dry-run] Would write ${content.length} bytes to ${target} ...\`)`).
      expect(stderr).toContain("[dry-run]");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("generated event allowlist (header list + count) equals Object.keys(hooks.json.hooks).sort()", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-"));
    const target = path.join(dir, "adapter.ts");
    try {
      const { stdout, exitCode } = await runScript(["--dry-run", "--target", target]);
      expect(exitCode).toBe(0);

      const raw = readFileSync(HOOKS_JSON_PATH, "utf8");
      const doc = JSON.parse(raw) as { hooks?: Record<string, unknown[]> };
      // Independent re-derivation of the allowlist, mirroring
      // deriveEventAllowlist() at scripts/sync-codex-adapter.ts:84-86
      // (`Object.keys(doc.hooks ?? {}).sort()`) without importing the
      // generator's own helper.
      const expectedAllowlist = Object.keys(doc.hooks ?? {}).sort();
      expect(expectedAllowlist.length).toBeGreaterThan(0);

      // Header count: "Event allowlist live-read from shared SSoT hooks.json (N events):"
      // Evidence: scripts/sync-codex-adapter.ts:121 (template literal) and :165-169
      // (`eventAllowlist.length === 0` guard proves the count always reflects
      // Object.keys(doc.hooks).length at generation time).
      expect(stdout).toContain(
        `Event allowlist live-read from shared SSoT hooks.json (${expectedAllowlist.length} events):`,
      );

      // Header list: each event rendered as `  "<event>",` on its own line.
      // Evidence: scripts/sync-codex-adapter.ts:105
      // (`eventAllowlist.map((e) => \`  "${e}",\`).join("\\n")`).
      for (const event of expectedAllowlist) {
        expect(stdout).toContain(`  "${event}",`);
      }

      // No extra events beyond the expected set: extract the quoted lines
      // inside the allowlist block and compare as a set.
      const allowlistBlockMatch = stdout.match(
        /Event allowlist live-read from shared SSoT hooks\.json \(\d+ events\):\n([\s\S]*?)\n \*\n/,
      );
      expect(allowlistBlockMatch).not.toBeNull();
      const renderedEvents = Array.from(
        (allowlistBlockMatch?.[1] ?? "").matchAll(/"([^"]+)",/g),
      ).map((m) => m[1]);
      expect(renderedEvents.sort()).toEqual(expectedAllowlist);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("thin-shim invariants: AUTO-GENERATED header, DO NOT EDIT BY HAND guard, single delegating import, runCodexHookAdapterCli() call, no other imports", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-"));
    const target = path.join(dir, "adapter.ts");
    try {
      const { stdout, exitCode } = await runScript(["--dry-run", "--target", target]);
      expect(exitCode).toBe(0);

      // Evidence: scripts/sync-codex-adapter.ts:111
      // ("AUTO-GENERATED from ${displayHooksJsonPath} — see scripts/sync-codex-adapter.ts; DO NOT EDIT BY HAND").
      expect(stdout).toContain("AUTO-GENERATED");
      expect(stdout).toContain("DO NOT EDIT BY HAND");

      // Generated file must itself be directly executable via a shebang.
      // Evidence: scripts/sync-codex-adapter.ts:107
      // (`generateAdapterContent()`'s template literal begins with `#!/usr/bin/env bun\n`).
      expect(stdout.startsWith("#!/usr/bin/env bun")).toBe(true);

      // Evidence: scripts/sync-codex-adapter.ts:130
      // (`import { runCodexHookAdapterCli } from "${pluginRoot}/lib/codex/codex-hook-adapter.ts";`)
      expect(stdout).toContain("/lib/codex/codex-hook-adapter.ts");
      expect(stdout).toContain("runCodexHookAdapterCli");

      // Evidence: scripts/sync-codex-adapter.ts:132
      // (`process.stdout.write(await runCodexHookAdapterCli());` is the file's final statement).
      const trimmed = stdout.trimEnd();
      expect(trimmed.endsWith("process.stdout.write(await runCodexHookAdapterCli());")).toBe(true);

      // Thin-shim = exactly one import statement in the generated content.
      // Verified against generateAdapterContent()'s template literal
      // (scripts/sync-codex-adapter.ts:107-133): the only line starting
      // with "import " in the returned string is line 130 above; the
      // generator's OWN imports (node:fs/node:os/node:path at :30-32) are
      // part of the generator script itself, not the generated output.
      const importLines = stdout
        .split("\n")
        .filter((line) => line.trimStart().startsWith("import "));
      expect(importLines).toHaveLength(1);
      expect(importLines[0]).toContain("runCodexHookAdapterCli");

      // The retired Claude plugin install path must never be reintroduced
      // as the generated shim's source-of-truth reference.
      // Evidence: scripts/sync-codex-adapter.ts:5-6, 27 (source is described
      // as "the shared private marketplace plugin hook registry" /
      // "plugins/palantir-mini/hooks/hooks.json", never
      // "~/.claude/plugins/palantir-mini/hooks/hooks.json").
      expect(stdout).not.toContain("~/.claude/plugins/palantir-mini/hooks/hooks.json");

      // The generated shim must state the adapter boundary explicitly:
      // runtime-local adapters are protocol consumers, not workflow authorities.
      // Evidence: scripts/sync-codex-adapter.ts:118-119
      // ("This file MUST remain a thin shim. Per .ssot-authority.json forbidden-fork policy,
      //   runtime-local adapters are protocol consumers, not workflow authorities.").
      expect(stdout).toContain("protocol consumers, not workflow authorities");

      // The generated shim must never reference the old native-hook-adapter.ts
      // fork path — the only delegating import is codex-hook-adapter.ts (SSoT lib).
      // Evidence: scripts/sync-codex-adapter.ts:107-133 (generateAdapterContent()'s
      // template literal contains exactly one import, to codex-hook-adapter.ts;
      // native-hook-adapter.ts does not appear anywhere in the generator source).
      expect(stdout).not.toContain("native-hook-adapter.ts");

      // Evidence: scripts/sync-codex-adapter.ts:23, 128
      // ("Per canonical plan v2 §4 row 6.2 (sprint-129 PR 6.2; PHASE 6 PR 2/7).").
      expect(stdout).toContain("6.2");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("dry-run output is byte-identical across repeated invocations (generatedAt derives from hooks.json mtime, not wall-clock)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-"));
    const targetA = path.join(dir, "adapter-a.ts");
    const targetB = path.join(dir, "adapter-b.ts");
    try {
      // Evidence: scripts/sync-codex-adapter.ts:172-173
      // ("Derive the timestamp from the SSoT hook registry so recurring
      // sync jobs are idempotent." / `statSync(HOOKS_JSON_PATH).mtime.toISOString()`)
      // — generatedAt is a function of hooks.json's mtime, which does not
      // change between these two invocations, so output must be identical.
      const first = await runScript(["--dry-run", "--target", targetA]);
      const second = await runScript(["--dry-run", "--target", targetB]);
      expect(first.exitCode).toBe(0);
      expect(second.exitCode).toBe(0);
      expect(second.stdout).toBe(first.stdout);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  describe("failure lane: invalid hooks.json", () => {
    function buildFixture(): { fixtureRoot: string; fixtureScript: string } {
      const fixtureRoot = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-fixture-"));
      mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
      mkdirSync(path.join(fixtureRoot, "hooks"), { recursive: true });

      // PLUGIN_ROOT is derived from the script's OWN file location
      // (scripts/sync-codex-adapter.ts:34: `path.resolve(import.meta.dir, "..")`),
      // so the fixture must preserve the script's relative layout
      // (<root>/scripts/sync-codex-adapter.ts) for PLUGIN_ROOT to resolve
      // to the fixture root rather than the real plugin root. We must also
      // invoke THIS copy of the script (not the real repo's SCRIPT path) —
      // otherwise import.meta.dir resolves against the real plugin root and
      // the fixture's hooks.json is never consulted.
      const scriptSource = readFileSync(SCRIPT, "utf8");
      const fixtureScript = path.join(fixtureRoot, "scripts", "sync-codex-adapter.ts");
      writeFileSync(fixtureScript, scriptSource, "utf8");

      // Minimal required files, per the script's own precondition checks:
      // .ssot-authority.json existence (scripts/sync-codex-adapter.ts:144)
      // and hooks/hooks.json existence + validity (:151-163).
      writeFileSync(
        path.join(fixtureRoot, ".ssot-authority.json"),
        JSON.stringify({ kind: "test-fixture" }),
        "utf8",
      );
      writeFileSync(path.join(fixtureRoot, "hooks", "hooks.json"), "{ this is not valid JSON", "utf8");

      return { fixtureRoot, fixtureScript };
    }

    test("exits 1 with a useful stderr message when hooks.json is invalid JSON", async () => {
      const fixtureOutDir = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-out-"));
      const fixtureTarget = path.join(fixtureOutDir, "adapter.ts");
      const { fixtureRoot, fixtureScript } = buildFixture();
      try {
        const { exitCode, stderr, stdout } = await runScript(
          ["--dry-run", "--target", fixtureTarget],
          fixtureRoot,
          fixtureScript,
        );

        // Evidence: scripts/sync-codex-adapter.ts:71-82 (validateHooksJson
        // throws "hooks.json parse failed: ..." on JSON.parse failure) and
        // :156-163 (main() catches, logs "ERROR: <message>", and
        // process.exit(1)).
        expect(exitCode).toBe(1);
        expect(stderr).toContain("ERROR:");
        expect(stderr).toContain("hooks.json parse failed");
        expect(stdout).toBe("");
        expect(existsSync(fixtureTarget)).toBe(false);
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
        rmSync(fixtureOutDir, { recursive: true, force: true });
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Standalone preconditions & source-level guards
// ────────────────────────────────────────────────────────────────────────────

describe("sync-codex-adapter.ts input validation", () => {
  test("script file exists at expected path", async () => {
    const exists = await Bun.file(SCRIPT).exists();
    expect(exists).toBe(true);
  });

  test("hooks.json exists as SSoT source", async () => {
    const exists = await Bun.file(HOOKS_JSON_PATH).exists();
    expect(exists).toBe(true);
  });

  test(".ssot-authority.json exists (PR 6.1 precondition)", async () => {
    const markerPath = path.join(PLUGIN_ROOT, ".ssot-authority.json");
    const exists = await Bun.file(markerPath).exists();
    expect(exists).toBe(true);
  });

  test("script source does not name the retired Claude plugin install path as SSoT, and instead names the shared private marketplace registry", async () => {
    const source = readFileSync(SCRIPT, "utf8");
    // Evidence: scripts/sync-codex-adapter.ts source has no occurrence of
    // "~/.claude/plugins/palantir-mini/hooks/hooks.json" anywhere.
    expect(source).not.toContain("~/.claude/plugins/palantir-mini/hooks/hooks.json");
    // Evidence: scripts/sync-codex-adapter.ts:6
    // ("Regenerates ~/.codex/hooks/palantir-mini-codex-hook-adapter.ts from
    //   the shared private marketplace plugin hook registry.").
    expect(source).toContain("shared private marketplace plugin hook registry");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Lane 2 — existence-gated deployed-shim drift check
// ────────────────────────────────────────────────────────────────────────────

const DEPLOYED_SHIM_PATH = path.join(homedir(), ".codex", "hooks", "palantir-mini-codex-hook-adapter.ts");
const deployedShimPresent = existsSync(DEPLOYED_SHIM_PATH);

describe("sync-codex-adapter.ts (Lane 2: deployed-shim drift, existence-gated)", () => {
  // Existence-gated per repo precedent: machine-specific fixtures are
  // skipped rather than hard-failed when absent (e.g.
  // tests/bridge/handlers/semantic-drift-audit.test.ts's
  // `test.skipIf(!palantirMathPresent)` and
  // tests/runtime-boundary/runtime-boundary.test.ts's
  // `test.skipIf(!runtimeBoundaryContractPresent)`). True in CI and in this
  // sandbox: no ~/.codex/hooks/palantir-mini-codex-hook-adapter.ts exists.
  test.skipIf(!deployedShimPresent)(
    "deployed shim matches what the generator would produce today",
    async () => {
      const dir = mkdtempSync(path.join(tmpdir(), "sync-codex-adapter-drift-"));
      const target = path.join(dir, "adapter.ts");
      try {
        const { stdout, exitCode } = await runScript(["--dry-run", "--target", target]);
        expect(exitCode).toBe(0);

        const deployed = readFileSync(DEPLOYED_SHIM_PATH, "utf8");
        expect(stdout).toBe(deployed);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});
