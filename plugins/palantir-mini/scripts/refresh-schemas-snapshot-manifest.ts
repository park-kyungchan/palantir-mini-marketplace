#!/usr/bin/env bun
/**
 * refresh-schemas-snapshot-manifest.ts
 *
 * Deterministic regenerator for the CANONICAL schemas-snapshot integrity index:
 *   plugins/palantir-mini/runtime-overlay/schemas-snapshot/MANIFEST.json
 *     -> fileSha256Index / totalFiles / totalBytes
 *
 * Unlike scripts/refresh-runtime-overlay.ts (which copies from a SOURCE tree
 * and indexes the copy), this script computes the index IN-PLACE over the
 * snapshot subtree itself — the snapshot IS the plugin-owned SSoT (see
 * runtime-overlay/schemas-snapshot/CANONICAL.md). No files are copied.
 *
 * Usage:
 *   bun run scripts/refresh-schemas-snapshot-manifest.ts          # rewrite MANIFEST.json
 *   bun run scripts/refresh-schemas-snapshot-manifest.ts --check  # verify only; exit 1 on drift
 *
 * The same compute/verify logic backs the pm_plugin_self_check release axis
 * (check-schemas-snapshot-manifest), so a version bump / release self-check
 * keeps the index fresh.
 */

import {
  schemasSnapshotDir,
  verifySnapshotManifest,
  writeRefreshedManifest,
} from "../lib/runtime-overlay/schemas-snapshot-manifest";

function main(): void {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const dir = schemasSnapshotDir();

  if (checkOnly) {
    const { inSync, drift } = verifySnapshotManifest(dir);
    if (inSync) {
      console.log(`schemas-snapshot MANIFEST in sync (${drift.computedTotalFiles} files).`);
      process.exit(0);
    }
    console.error("schemas-snapshot MANIFEST is STALE:");
    console.error(`  recorded files=${drift.recordedTotalFiles} bytes=${drift.recordedTotalBytes}`);
    console.error(`  computed files=${drift.computedTotalFiles} bytes=${drift.computedTotalBytes}`);
    if (drift.missingInManifest.length)
      console.error(`  missing from manifest (${drift.missingInManifest.length}): ${drift.missingInManifest.join(", ")}`);
    if (drift.missingOnDisk.length)
      console.error(`  in manifest but absent on disk (${drift.missingOnDisk.length}): ${drift.missingOnDisk.join(", ")}`);
    if (drift.hashMismatches.length)
      console.error(`  hash mismatches (${drift.hashMismatches.length}): ${drift.hashMismatches.join(", ")}`);
    console.error("Run `bun run scripts/refresh-schemas-snapshot-manifest.ts` to regenerate.");
    process.exit(1);
  }

  const manifest = writeRefreshedManifest(dir);
  console.log(`schemas-snapshot MANIFEST.json regenerated:`);
  console.log(`  totalFiles: ${manifest.totalFiles}`);
  console.log(`  totalBytes: ${manifest.totalBytes}`);
  console.log(`  packageVersion: ${manifest.packageVersion}`);
  console.log(`  snapshotAt: ${manifest.snapshotAt}`);
}

main();
