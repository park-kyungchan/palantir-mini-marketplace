// palantir-mini — schemas-snapshot MANIFEST integrity helper
//
// runtime-overlay/schemas-snapshot/ is the CANONICAL plugin-owned schema SSoT
// (NOT synced from any source — see schemas-snapshot/CANONICAL.md). Its
// MANIFEST.json carries a fileSha256Index over the snapshot's own files so
// consumers + the release self-check can detect drift between the recorded
// index and the live files on disk.
//
// Unlike scripts/refresh-runtime-overlay.ts (which COPIES from a source tree
// and then indexes the copy), this helper computes the index IN-PLACE over the
// snapshot subtree itself: the snapshot IS the source. It is the single source
// of truth shared by:
//   - scripts/refresh-schemas-snapshot-manifest.ts (regenerate / --check)
//   - bridge/handlers/pm-plugin-self-check/check-schemas-snapshot-manifest.ts
//
// Authority:
//   - rules/08-schema-versioning.md (schema semver as tracked interface)
//   - rules/10-events-jsonl.md (this helper is non-emitting)
//   - runtime-overlay/schemas-snapshot/CANONICAL.md (in-plugin SSoT taxonomy)

import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../config/root";

/** Absolute path to the canonical schemas-snapshot directory. */
export function schemasSnapshotDir(): string {
  return path.join(resolvePalantirMiniRoot(), "runtime-overlay", "schemas-snapshot");
}

const MANIFEST_BASENAME = "MANIFEST.json";

// Mirrors scripts/refresh-runtime-overlay.ts exclusion semantics so the two
// regenerators stay behaviourally consistent. The snapshot subtree is fully
// git-tracked with no test files today, but these guards keep the walk robust
// if stray build/test artifacts ever appear.
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

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, base));
    } else if (entry.isFile()) {
      results.push(relPath);
    }
  }
  return results;
}

export interface SchemasSnapshotManifest {
  version: string;
  snapshotAt: string;
  sourcePath: string;
  purpose: string;
  packageVersion: string;
  totalFiles: number;
  totalBytes: number;
  fileSha256Index: Record<string, string>;
}

export interface ComputedSnapshotIndex {
  /** Alphabetically-sorted relative-path -> sha256 over the live snapshot files. */
  fileSha256Index: Record<string, string>;
  totalFiles: number;
  totalBytes: number;
}

/**
 * Compute the fileSha256Index in-place over the live schemas-snapshot files.
 * MANIFEST.json itself is excluded (it carries the index, so it cannot index
 * itself). Paths use forward slashes and are sorted to match the existing
 * MANIFEST.json byte format.
 */
export function computeSnapshotIndex(snapshotDir = schemasSnapshotDir()): ComputedSnapshotIndex {
  const files = walkFiles(snapshotDir).filter((rel) => rel !== MANIFEST_BASENAME);

  const unsorted: Record<string, string> = {};
  let totalBytes = 0;
  for (const rel of files) {
    const full = path.join(snapshotDir, rel);
    unsorted[rel.split(path.sep).join("/")] = sha256File(full);
    totalBytes += fs.statSync(full).size;
  }

  const fileSha256Index: Record<string, string> = {};
  for (const key of Object.keys(unsorted).sort()) {
    fileSha256Index[key] = unsorted[key]!;
  }

  return { fileSha256Index, totalFiles: files.length, totalBytes };
}

export function readManifest(snapshotDir = schemasSnapshotDir()): SchemasSnapshotManifest {
  const manifestPath = path.join(snapshotDir, MANIFEST_BASENAME);
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SchemasSnapshotManifest;
}

export interface SnapshotManifestDrift {
  /** Paths in the recorded index but absent on disk. */
  missingOnDisk: string[];
  /** Paths on disk but absent from the recorded index. */
  missingInManifest: string[];
  /** Paths present in both whose recorded sha differs from the live sha. */
  hashMismatches: string[];
  /** True when totalFiles/totalBytes recorded in the manifest match the live tree. */
  countsMatch: boolean;
  recordedTotalFiles: number;
  computedTotalFiles: number;
  recordedTotalBytes: number;
  computedTotalBytes: number;
}

export interface SnapshotManifestVerifyResult {
  inSync: boolean;
  drift: SnapshotManifestDrift;
}

/**
 * Verify the recorded MANIFEST.json fileSha256Index (and totalFiles/totalBytes)
 * against the live snapshot files. Pure read — never writes.
 */
export function verifySnapshotManifest(
  snapshotDir = schemasSnapshotDir(),
): SnapshotManifestVerifyResult {
  const manifest = readManifest(snapshotDir);
  const computed = computeSnapshotIndex(snapshotDir);

  const recorded = manifest.fileSha256Index ?? {};
  const recordedKeys = new Set(Object.keys(recorded));
  const computedKeys = new Set(Object.keys(computed.fileSha256Index));

  const missingOnDisk = [...recordedKeys].filter((k) => !computedKeys.has(k)).sort();
  const missingInManifest = [...computedKeys].filter((k) => !recordedKeys.has(k)).sort();
  const hashMismatches = [...recordedKeys]
    .filter((k) => computedKeys.has(k) && recorded[k] !== computed.fileSha256Index[k])
    .sort();

  const countsMatch =
    manifest.totalFiles === computed.totalFiles &&
    manifest.totalBytes === computed.totalBytes;

  const inSync =
    missingOnDisk.length === 0 &&
    missingInManifest.length === 0 &&
    hashMismatches.length === 0 &&
    countsMatch;

  return {
    inSync,
    drift: {
      missingOnDisk,
      missingInManifest,
      hashMismatches,
      countsMatch,
      recordedTotalFiles: manifest.totalFiles,
      computedTotalFiles: computed.totalFiles,
      recordedTotalBytes: manifest.totalBytes,
      computedTotalBytes: computed.totalBytes,
    },
  };
}

/**
 * Recompute the index in-place and return the next MANIFEST.json object,
 * preserving the existing manifest's descriptive fields (sourcePath, purpose,
 * version) and re-reading the live packageVersion from the snapshot's own
 * package.json. snapshotAt is refreshed to now.
 */
export function buildRefreshedManifest(
  snapshotDir = schemasSnapshotDir(),
): SchemasSnapshotManifest {
  const prev = readManifest(snapshotDir);
  const computed = computeSnapshotIndex(snapshotDir);

  const pkgPath = path.join(snapshotDir, "package.json");
  let packageVersion = prev.packageVersion;
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    packageVersion = pkg.version ?? prev.packageVersion;
  }

  return {
    version: prev.version,
    snapshotAt: new Date().toISOString(),
    sourcePath: prev.sourcePath,
    purpose: prev.purpose,
    packageVersion,
    totalFiles: computed.totalFiles,
    totalBytes: computed.totalBytes,
    fileSha256Index: computed.fileSha256Index,
  };
}

/** Recompute and write MANIFEST.json. Returns the written manifest. */
export function writeRefreshedManifest(
  snapshotDir = schemasSnapshotDir(),
): SchemasSnapshotManifest {
  const manifest = buildRefreshedManifest(snapshotDir);
  const manifestPath = path.join(snapshotDir, MANIFEST_BASENAME);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}
