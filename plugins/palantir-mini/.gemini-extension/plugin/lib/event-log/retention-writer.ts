/**
 * retention-writer — atomic write + read for RetentionManifestEntry
 * @owner palantirkc-plugin-events
 * @purpose Atomic write (tmp + rename) and read of per-session retention/manifest.json.
 *
 * Atomic write pattern mirrors rotate.ts: write to .tmp then rename.
 * Read returns null when file is absent; callers fall back to DEFAULT_RETENTION_MANIFEST.
 *
 * Per canonical plan v2 §4 row 4.4 + rule 26 §Substrate routing.
 */

import * as fs from "fs";
import * as path from "path";
import {
  DEFAULT_RETENTION_MANIFEST,
  isRetentionManifestEntry,
} from "#schemas/ontology/primitives/retention-manifest";
import type { RetentionManifestEntry } from "#schemas/ontology/primitives/retention-manifest";

export type { RetentionManifestEntry };
export { DEFAULT_RETENTION_MANIFEST };

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function retentionDir(sessionDir: string): string {
  return path.join(sessionDir, "retention");
}

function manifestPath(sessionDir: string): string {
  return path.join(retentionDir(sessionDir), "manifest.json");
}

function manifestTmpPath(sessionDir: string): string {
  return path.join(retentionDir(sessionDir), "manifest.json.tmp");
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Atomically write a RetentionManifestEntry to `<sessionDir>/retention/manifest.json`.
 *
 * Uses write-to-tmp + rename (POSIX-atomic) to avoid torn reads under concurrent
 * callers. The `retention/` subdirectory is created on first write.
 */
export function writeRetentionManifest(opts: {
  sessionDir: string;
  manifest: RetentionManifestEntry;
}): void {
  const { sessionDir, manifest } = opts;
  const dir = retentionDir(sessionDir);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = manifestTmpPath(sessionDir);
  const dest = manifestPath(sessionDir);

  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, dest);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Read the RetentionManifestEntry from `<sessionDir>/retention/manifest.json`.
 *
 * Returns `null` when the file does not exist or fails to parse.
 * Callers wanting a guaranteed non-null result should fall back to
 * `DEFAULT_RETENTION_MANIFEST`:
 *
 * ```ts
 * const manifest = readRetentionManifest(sessionDir) ?? DEFAULT_RETENTION_MANIFEST;
 * ```
 */
export function readRetentionManifest(
  sessionDir: string
): RetentionManifestEntry | null {
  const dest = manifestPath(sessionDir);
  try {
    const raw = fs.readFileSync(dest, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isRetentionManifestEntry(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
