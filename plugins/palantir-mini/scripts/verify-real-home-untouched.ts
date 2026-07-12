#!/usr/bin/env bun
/**
 * Standalone guard for the slice-2 (test-home isolation) fix: proves that
 * running the 7 fixed prompt-DTC-gate test files never touches the REAL
 * `~/.palantir-mini` global state directory.
 *
 * NOT wired into the default `bun test`/CI invocation — a future contributor's
 * `bun test` run must not depend on the ambient state of their real home
 * directory. Run this on-demand: `bun run scripts/verify-real-home-untouched.ts`
 * (also exposed as `bun run test:home-isolation-guard`).
 *
 * Not a `bun:test` file because Bun's test runner does not expose a
 * cross-file before/after hook spanning the whole suite — this wraps the
 * suite as a subprocess instead (see design-w5-token-diet.md §2c).
 *
 * FULL RECURSIVE walk (R1, W5 review finding): the original version only
 * snapshotted `REAL_GLOBAL_STATE_DIR`'s own mtime plus its DIRECT children's
 * mtimes. A directory's mtime only changes when an entry is added/removed
 * DIRECTLY inside it, so two real leak classes were invisible to it: (a)
 * appending to an already-existing file two or more levels deep (its parent
 * dir's mtime never changes), and (b) creating a new file inside an
 * EXISTING subdirectory (e.g. under `session/outcome-pairs/` — the
 * top-level `session` dir's own mtime is unaffected). `snapshot()` now walks
 * the entire tree and records `{size, mtimeMs}` per FILE, keyed by its path
 * relative to `REAL_GLOBAL_STATE_DIR`; `diffSnapshots()` compares the two
 * full file sets. Both are exported so a throwaway fixture-based proof can
 * call the real snapshot/diff logic directly without paying for the (slow)
 * guarded subprocess test run; `main()` only runs when this file is the
 * process entry point (`import.meta.main`), so importing it for its exports
 * has no side effect.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";

const REAL_GLOBAL_STATE_DIR = join(homedir(), ".palantir-mini");

const GUARDED_TEST_FILES = [
  "tests/hooks/prompt-dtc-enforcement-gate.test.ts",
  "tests/hooks/prompt-dtc-enforcement-gate-dtc-turn.test.ts",
  "tests/hooks/prompt-dtc-scoped-blocking.test.ts",
  "tests/hooks/prompt-dtc-enforcement-gate-fde-skip.test.ts",
  "tests/hooks/prompt-dtc-enforcement-gate-authorized-delivery.test.ts",
  "tests/evals/prompt-to-dtc-regression.test.ts",
  "tests/e2e/drift-rebind-altitude-replay.test.ts",
] as const;

export interface FileStat {
  readonly size: number;
  readonly mtimeMs: number;
}

export interface Snapshot {
  readonly exists: boolean;
  /** Path relative to REAL_GLOBAL_STATE_DIR -> {size, mtimeMs}, one entry per FILE found by a full recursive walk (directories are traversed, not recorded as their own entries). */
  readonly files: Readonly<Record<string, FileStat>>;
}

function walkFiles(dir: string, baseDir: string, out: Record<string, FileStat>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue; // never follow symlinks (cycle/escape safety)
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, baseDir, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const st = statSync(fullPath);
    out[relative(baseDir, fullPath)] = { size: st.size, mtimeMs: st.mtimeMs };
  }
}

export function snapshot(): Snapshot {
  if (!existsSync(REAL_GLOBAL_STATE_DIR)) {
    return { exists: false, files: {} };
  }
  const files: Record<string, FileStat> = {};
  walkFiles(REAL_GLOBAL_STATE_DIR, REAL_GLOBAL_STATE_DIR, files);
  return { exists: true, files };
}

export function diffSnapshots(before: Snapshot, after: Snapshot): string[] {
  const diffs: string[] = [];

  if (!before.exists && after.exists) {
    diffs.push(`${REAL_GLOBAL_STATE_DIR} was CREATED during the test run`);
    return diffs;
  }
  if (!before.exists) {
    return diffs;
  }

  const beforePaths = new Set(Object.keys(before.files));
  const afterPaths = new Set(Object.keys(after.files));

  for (const relPath of afterPaths) {
    if (!beforePaths.has(relPath)) {
      diffs.push(`new file appeared: ${relPath}`);
    }
  }
  for (const relPath of beforePaths) {
    if (!afterPaths.has(relPath)) {
      diffs.push(`file disappeared: ${relPath}`);
      continue;
    }
    const b = before.files[relPath]!;
    const a = after.files[relPath]!;
    if (b.size !== a.size || b.mtimeMs !== a.mtimeMs) {
      diffs.push(
        `file changed: ${relPath} (size ${b.size} -> ${a.size}, mtime ${b.mtimeMs} -> ${a.mtimeMs})`,
      );
    }
  }

  return diffs;
}

function main(): void {
  const pluginRoot = join(import.meta.dir, "..");
  const before = snapshot();

  console.log(`Snapshotting ${REAL_GLOBAL_STATE_DIR} (exists=${before.exists}) before the guarded test run...`);
  console.log(`Running: bun test ${GUARDED_TEST_FILES.join(" ")}`);

  try {
    execFileSync("bun", ["test", ...GUARDED_TEST_FILES], {
      cwd: pluginRoot,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("The guarded test run itself failed — see output above.");
    process.exitCode = 1;
    return;
  }

  const after = snapshot();
  const diffs = diffSnapshots(before, after);

  if (diffs.length > 0) {
    console.error(`FAIL: ${REAL_GLOBAL_STATE_DIR} was touched during the test run:`);
    for (const diff of diffs) {
      console.error(`  - ${diff}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`PASS: ${REAL_GLOBAL_STATE_DIR} was not touched by the guarded test run.`);
}

if (import.meta.main) {
  main();
}
