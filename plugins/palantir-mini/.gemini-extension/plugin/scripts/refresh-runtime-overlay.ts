#!/usr/bin/env bun
/**
 * refresh-runtime-overlay.ts
 *
 * Deterministic regen script for:
 *   /home/palantirkc/palantir-mini/runtime-overlay/schemas-snapshot/
 *   /home/palantirkc/palantir-mini/runtime-overlay/ontology-shared-core/
 *
 * Usage:
 *   bun run scripts/refresh-runtime-overlay.ts --target schemas
 *   bun run scripts/refresh-runtime-overlay.ts --target shared-core
 *   bun run scripts/refresh-runtime-overlay.ts --target all
 *
 * Per canonical-plan-completion-handoff §C.5 chore #1.
 */

import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { resolvePalantirMiniRoot } from "../lib/config/root";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HOME = os.homedir();
const PALANTIR_MINI_ROOT = resolvePalantirMiniRoot();

const TARGETS = {
  schemas: {
    sourcePath: path.join(HOME, ".claude/schemas"),
    targetPath: path.join(PALANTIR_MINI_ROOT, "runtime-overlay", "schemas-snapshot"),
    sourcePathAlias: "~/.claude/schemas/",
    purpose:
      "Plugin-owned portable @palantirKC/claude-schemas snapshot. Runtime imports resolve through #schemas/* by default. Upstream test files and runtime session state are intentionally excluded from the plugin substrate snapshot.",
  },
  "shared-core": {
    sourcePath: path.join(HOME, "ontology/shared-core"),
    targetPath: path.join(PALANTIR_MINI_ROOT, "runtime-overlay", "ontology-shared-core"),
    sourcePathAlias: "~/ontology/shared-core/",
    purpose:
      "Plugin-owned portable ontology shared-core snapshot. Runtime imports resolve through #shared-core/* by default. Upstream test files are intentionally excluded from the plugin substrate snapshot.",
  },
};

// ---------------------------------------------------------------------------
// Exclusion rules
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "__tests__",
  ".session",
  ".palantir-mini",
  ".git",
  "tests",
]);

const EXCLUDED_FILE_PATTERNS = [/\.test\.ts$/, /\.spec\.ts$/];

function isExcluded(relativePath: string): boolean {
  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDED_DIRS.has(part)) return true;
  }
  const basename = path.basename(relativePath);
  for (const pattern of EXCLUDED_FILE_PATTERNS) {
    if (pattern.test(basename)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// File utilities
// ---------------------------------------------------------------------------

function sha256File(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function walkFiles(dir: string, base: string = dir): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (isExcluded(relPath)) continue;
    if (entry.isSymbolicLink()) {
      // Skip symlinks (avoids node_modules symlink in shared-core)
      continue;
    }
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, base));
    } else if (entry.isFile()) {
      results.push(relPath);
    }
  }
  return results;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readPackageVersion(sourcePath: string): string {
  const pkgPath = path.join(sourcePath, "package.json");
  if (!fs.existsSync(pkgPath)) return "unknown";
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return pkg.version ?? "unknown";
}

// ---------------------------------------------------------------------------
// Core refresh logic
// ---------------------------------------------------------------------------

async function refreshTarget(targetKey: "schemas" | "shared-core"): Promise<void> {
  const cfg = TARGETS[targetKey];
  const { sourcePath, targetPath, sourcePathAlias, purpose } = cfg;

  console.log(`\n=== Refreshing ${targetKey} ===`);
  console.log(`  Source: ${sourcePath}`);
  console.log(`  Target: ${targetPath}`);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source path does not exist: ${sourcePath}`);
  }

  // Walk source files
  const sourceFiles = walkFiles(sourcePath);
  console.log(`  Source files found: ${sourceFiles.length}`);

  // Build sha256 index + compute stats
  const fileSha256Index: Record<string, string> = {};
  let totalBytes = 0;

  ensureDir(targetPath);

  for (const relPath of sourceFiles) {
    const srcFile = path.join(sourcePath, relPath);
    const dstFile = path.join(targetPath, relPath);

    const hash = sha256File(srcFile);
    fileSha256Index[relPath] = hash;

    const stat = fs.statSync(srcFile);
    totalBytes += stat.size;

    // Copy file preserving relative path
    ensureDir(path.dirname(dstFile));
    fs.copyFileSync(srcFile, dstFile);
  }

  // Remove target files no longer in source
  const targetFiles = walkFiles(targetPath);
  let removedCount = 0;
  for (const relPath of targetFiles) {
    if (relPath === "MANIFEST.json") continue; // handled separately
    if (!fileSha256Index[relPath]) {
      const dstFile = path.join(targetPath, relPath);
      fs.unlinkSync(dstFile);
      console.log(`  Removed (no longer in source): ${relPath}`);
      removedCount++;
    }
  }

  // Sort fileSha256Index alphabetically
  const sortedIndex: Record<string, string> = {};
  for (const key of Object.keys(fileSha256Index).sort()) {
    sortedIndex[key] = fileSha256Index[key]!;
  }

  const packageVersion = readPackageVersion(sourcePath);

  // Write MANIFEST.json
  const manifest = {
    version: "2.0.0",
    snapshotAt: new Date().toISOString(),
    sourcePath: sourcePathAlias,
    purpose,
    packageVersion,
    totalFiles: sourceFiles.length,
    totalBytes,
    fileSha256Index: sortedIndex,
  };

  const manifestPath = path.join(targetPath, "MANIFEST.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`  Package version: ${packageVersion}`);
  console.log(`  Total files: ${sourceFiles.length}`);
  console.log(`  Total bytes: ${totalBytes}`);
  console.log(`  Files removed: ${removedCount}`);
  console.log(`  MANIFEST.json written.`);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetFlag = args.find((a) => a.startsWith("--target="))?.slice(9) ??
    (args[args.indexOf("--target") + 1]);

  const target = targetFlag ?? "all";

  if (!["schemas", "shared-core", "all"].includes(target)) {
    console.error(`Unknown --target: ${target}. Use schemas|shared-core|all`);
    process.exit(1);
  }

  if (target === "schemas" || target === "all") {
    await refreshTarget("schemas");
  }
  if (target === "shared-core" || target === "all") {
    await refreshTarget("shared-core");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
