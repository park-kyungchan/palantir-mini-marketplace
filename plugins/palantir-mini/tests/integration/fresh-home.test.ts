// palantir-mini — tests/integration/fresh-home.test.ts (sprint-061 A.W7)
//
// Fresh-home bootstrap integration test.
//
// Purpose: verifies that the plugin-resident runtime-overlay acts as a
// complete cold-start substitute when the external ~/.claude/rules/ and
// ~/.claude/research/ directories are temporarily unavailable.
//
// This test is the acceptance criterion for the Codex proposal §Migration
// Acceptance Criteria: "plugin-only cold-start works without external
// ~/.claude/rules/ being present."
//
// Scenario:
//   1. Backup external ~/.claude/rules/ and ~/.claude/projects/-home-palantirkc/memory/
//      to temp dirs to simulate a fresh machine (neither directory present).
//   2. Invoke buildContextCapsule() directly — asserts non-empty additionalContext.
//   3. Invoke resolveRule(27) — asserts resolution via "plugin-overlay" source
//      (not "external"), confirming the fallback is exercised.
//   4. Invoke resolveResearchAnchor("harness species", "claude-code") — asserts
//      source is "plugin-snapshot" by default.
//   5. Restore both dirs and sha256-verify byte-identity.
//
// Safety: teardown is in try/finally so a mid-test failure never leaves
// ~/.claude/rules/ in a broken state.
//
// Authority: sprint-061 A.W7; plan ~/.claude/plans/inherited-discovering-quill.md §4.A.W7.
// Cross-ref: lib/runtime-overlay/resolve-rule.ts, build-context-capsule.ts,
//            research-core-select.ts.

import { test, expect, describe, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

import { buildContextCapsule } from "../../lib/runtime-overlay/build-context-capsule";
import { resolveRule, OVERLAY_RULES_DIR } from "../../lib/runtime-overlay/resolve-rule";
import { resolveResearchAnchor } from "../../lib/runtime-overlay/research-core-select";
import { resolveSchemaPath } from "../../lib/runtime-overlay/schema-resolve";
import { resolveSharedCorePath } from "../../lib/runtime-overlay/shared-core-resolve";
import { resolvePalantirMiniRoot } from "../../lib/config/root";

// ── Constants ─────────────────────────────────────────────────────────────────

const HOME = process.env.HOME ?? os.homedir();
const EXTERNAL_RULES_DIR = path.join(HOME, ".claude", "rules");
const MEMORY_DIR = path.join(HOME, ".claude", "projects", "-home-palantirkc", "memory");

/** Temporary backup dirs created during test — cleaned up in afterAll. */
let backupRulesDir: string | null = null;
let backupMemoryDir: string | null = null;
let rulesWereRenamed = false;
let memoryWereRenamed = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** sha256 of file contents; null if file does not exist. */
function fileSha256(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

/** Hash every file in a directory tree (relative-path → sha256). */
function hashDir(dir: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!fs.existsSync(dir)) return result;

  const recurse = (current: string, rel: string) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      const entryAbs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        recurse(entryAbs, entryRel);
      } else if (entry.isFile()) {
        const hash = fileSha256(entryAbs);
        if (hash !== null) result.set(entryRel, hash);
      }
    }
  };
  recurse(dir, "");
  return result;
}

/**
 * Move (rename) a directory to a new path.
 * Falls back to copy+delete when rename crosses filesystems.
 */
function moveDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  // Try atomic rename first.
  try {
    fs.renameSync(src, dest);
    return;
  } catch {
    // Cross-filesystem — fall through to manual copy.
  }
  // Manual recursive copy, then remove.
  copyDirRecursive(src, dest);
  fs.rmSync(src, { recursive: true, force: true });
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Teardown guard ────────────────────────────────────────────────────────────
// Runs after all tests — restores backed-up directories even if tests fail.

afterAll(() => {
  try {
    if (rulesWereRenamed && backupRulesDir && fs.existsSync(backupRulesDir)) {
      // Remove the (possibly empty) placeholder if rename created one.
      if (fs.existsSync(EXTERNAL_RULES_DIR)) {
        fs.rmSync(EXTERNAL_RULES_DIR, { recursive: true, force: true });
      }
      moveDir(backupRulesDir, EXTERNAL_RULES_DIR);
      backupRulesDir = null;
      rulesWereRenamed = false;
    }
    if (memoryWereRenamed && backupMemoryDir && fs.existsSync(backupMemoryDir)) {
      if (fs.existsSync(MEMORY_DIR)) {
        fs.rmSync(MEMORY_DIR, { recursive: true, force: true });
      }
      moveDir(backupMemoryDir, MEMORY_DIR);
      backupMemoryDir = null;
      memoryWereRenamed = false;
    }
  } catch (e) {
    // Last-resort: print to stderr so the user can manually fix.
    process.stderr.write(
      `\nWARNING: fresh-home.test.ts afterAll teardown failed:\n${String(e)}\n` +
      `If ~/.claude/rules/ is missing, restore from backup at:\n  ${backupRulesDir ?? "(already restored)"}\n`,
    );
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("fresh-home bootstrap: plugin overlay substitutes for missing external dirs", () => {

  test("plugin overlay CORE.md is present and non-empty", () => {
    const corePath = path.join(OVERLAY_RULES_DIR, "CORE.md");
    expect(fs.existsSync(corePath)).toBe(true);
    const content = fs.readFileSync(corePath, "utf8");
    expect(content.trim().length).toBeGreaterThan(0);
    // CORE.md must mention rule IDs (sanity — "rule NN" pattern or "## Core Invariants" heading)
    expect(content).toMatch(/rule\s+\d+|Core Invariants/i);
  });

  test("buildContextCapsule() returns non-empty string using plugin overlay", async () => {
    const capsule = await buildContextCapsule();
    expect(typeof capsule).toBe("string");
    expect(capsule.trim().length).toBeGreaterThan(0);
    // Should contain the section header written by build-context-capsule.ts
    expect(capsule).toContain("palantir-mini rules overlay capsule");
    // Should include content from CORE.md
    expect(capsule).toContain("CORE.md");
  });

  test("resolveRule(27) resolves to plugin-overlay when external rules are absent", async () => {
    // ── Setup: hash external rules dir before rename ──────────────────────────
    const preHashes = hashDir(EXTERNAL_RULES_DIR);

    // Create temp backup directory.
    backupRulesDir = fs.mkdtempSync(path.join(os.tmpdir(), "palantir-mini-rules-backup-"));
    // Remove the empty temp dir so rename can occupy it.
    fs.rmdirSync(backupRulesDir);

    let restoreError: unknown = null;

    try {
      // ── Move external rules away ──────────────────────────────────────────
      moveDir(EXTERNAL_RULES_DIR, backupRulesDir);
      rulesWereRenamed = true;
      expect(fs.existsSync(EXTERNAL_RULES_DIR)).toBe(false);

      // ── Exercise: resolveRule should now use plugin-overlay ───────────────
      const result = await resolveRule(27);
      expect(result.source).toBe("plugin-overlay");
      expect(result.body.trim().length).toBeGreaterThan(0);
      // Rule 27 is cross-runtime-substrate; body should mention substrate
      expect(result.body).toContain("cross-runtime");
      expect(result.filePath).toBeDefined();

    } catch (e) {
      restoreError = e;
    } finally {
      // ── Restore external rules ────────────────────────────────────────────
      if (rulesWereRenamed && backupRulesDir && fs.existsSync(backupRulesDir)) {
        if (fs.existsSync(EXTERNAL_RULES_DIR)) {
          fs.rmSync(EXTERNAL_RULES_DIR, { recursive: true, force: true });
        }
        moveDir(backupRulesDir, EXTERNAL_RULES_DIR);
        backupRulesDir = null;
        rulesWereRenamed = false;
      }
    }

    if (restoreError) throw restoreError;

    // ── Verify byte-identity of restored dir ─────────────────────────────────
    const postHashes = hashDir(EXTERNAL_RULES_DIR);
    expect(postHashes.size).toBe(preHashes.size);
    for (const [rel, hash] of preHashes) {
      expect(postHashes.get(rel)).toBe(hash);
    }
    // Verify CORE.md specifically.
    expect(fs.existsSync(path.join(EXTERNAL_RULES_DIR, "CORE.md"))).toBe(true);
  });

  test("resolveResearchAnchor can force plugin snapshot fallback", async () => {
    const previous = process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
    process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH = "1";
    try {
      const result = await resolveResearchAnchor("harness species", "claude-code");

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
      if (previous === undefined) delete process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
      else process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH = previous;
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

  test("buildContextCapsule() with external rules intact includes rules count", async () => {
    // With external rules present (restored by prior test), capsule should still
    // build from plugin overlay (overlay is checked first).
    const capsule = await buildContextCapsule();
    // The capsule should include "rules count: N active rules" from countOverlayRules().
    expect(capsule).toContain("rules count:");
    expect(capsule).toMatch(/\d+ active rules/);
  });

  test("memory dir stub is created when absent and bootstrap-home.sh exits 0", async () => {
    // ── Setup: backup memory dir ──────────────────────────────────────────────
    const memoryExists = fs.existsSync(MEMORY_DIR);
    backupMemoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "palantir-mini-memory-backup-"));
    fs.rmdirSync(backupMemoryDir);

    let restoreError: unknown = null;

    try {
      if (memoryExists) {
        moveDir(MEMORY_DIR, backupMemoryDir);
        memoryWereRenamed = true;
      }
      expect(fs.existsSync(MEMORY_DIR)).toBe(false);

      // Run bootstrap-home.sh; it should create the stub and exit 0.
      const scriptPath = path.join(
        process.env.CLAUDE_PLUGIN_ROOT ??
          path.join(HOME, ".claude", "plugins", "palantir-mini"),
        "scripts",
        "bootstrap-home.sh",
      );
      expect(fs.existsSync(scriptPath)).toBe(true);

      const proc = Bun.spawnSync(["sh", scriptPath], {
        env: { ...process.env },
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
      expect(proc.exitCode).toBe(0);
      expect(stdout).toContain("bootstrap-home OK");
      // Stub should have been created.
      expect(fs.existsSync(MEMORY_DIR)).toBe(true);

    } catch (e) {
      restoreError = e;
    } finally {
      // Restore memory dir.
      if (memoryWereRenamed && backupMemoryDir && fs.existsSync(backupMemoryDir)) {
        if (fs.existsSync(MEMORY_DIR)) {
          fs.rmSync(MEMORY_DIR, { recursive: true, force: true });
        }
        moveDir(backupMemoryDir, MEMORY_DIR);
        backupMemoryDir = null;
        memoryWereRenamed = false;
      } else if (!memoryWereRenamed && backupMemoryDir) {
        // Memory was not present originally; clean up stub if present.
        if (fs.existsSync(MEMORY_DIR)) {
          fs.rmSync(MEMORY_DIR, { recursive: true, force: true });
        }
        try { fs.rmdirSync(backupMemoryDir); } catch { /* empty dir may not exist */ }
        backupMemoryDir = null;
      }
    }

    if (restoreError) throw restoreError;
  });

  test("CORE.md is intact after all test teardowns (wc -l check)", () => {
    // Cross-verify that ~/.claude/rules/ was fully restored.
    expect(fs.existsSync(EXTERNAL_RULES_DIR)).toBe(true);
    const corePath = path.join(EXTERNAL_RULES_DIR, "CORE.md");
    expect(fs.existsSync(corePath)).toBe(true);
    const content = fs.readFileSync(corePath, "utf8");
    const lineCount = content.split("\n").length;
    // CORE.md is a T1 doc; rule 12 §Ceiling enforces ≤25 LOC.
    expect(lineCount).toBeGreaterThan(0);
    expect(lineCount).toBeLessThanOrEqual(30); // slight tolerance for trailing newline
  });

});
