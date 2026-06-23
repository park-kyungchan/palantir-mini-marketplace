// palantir-mini — pm-plugin-self-check schemas-snapshot MANIFEST integrity check
//
// runtime-overlay/schemas-snapshot/MANIFEST.json carries a fileSha256Index over
// the CANONICAL plugin-owned schema files. Because the snapshot is edited in
// place (it is the SSoT, not a synced copy), the recorded index drifts whenever
// a primitive is added/edited without regenerating MANIFEST.json. This release
// axis fails when the recorded index no longer matches the live files, so a
// version bump / release self-check keeps the index fresh.
//
// Regenerate with: bun run scripts/refresh-schemas-snapshot-manifest.ts
//
// Authority:
//   - rules/08-schema-versioning.md (schema semver as tracked interface)
//   - runtime-overlay/schemas-snapshot/CANONICAL.md (in-plugin SSoT taxonomy)

import { verifySnapshotManifest } from "../../../lib/runtime-overlay/schemas-snapshot-manifest";

export interface SchemasSnapshotManifestCheckResult {
  status: "pass" | "fail";
  details: string;
  missingInManifest: number;
  missingOnDisk: number;
  hashMismatches: number;
  countsMatch: boolean;
}

export function checkSchemasSnapshotManifest(): SchemasSnapshotManifestCheckResult {
  try {
    const { inSync, drift } = verifySnapshotManifest();
    if (inSync) {
      return {
        status: "pass",
        details: `schemas-snapshot MANIFEST fileSha256Index in sync (${drift.computedTotalFiles} files, ${drift.computedTotalBytes} bytes)`,
        missingInManifest: 0,
        missingOnDisk: 0,
        hashMismatches: 0,
        countsMatch: true,
      };
    }
    return {
      status: "fail",
      details:
        `schemas-snapshot MANIFEST is STALE: ` +
        `missingFromManifest=${drift.missingInManifest.length} ` +
        `missingOnDisk=${drift.missingOnDisk.length} ` +
        `hashMismatches=${drift.hashMismatches.length} ` +
        `recordedFiles=${drift.recordedTotalFiles} computedFiles=${drift.computedTotalFiles} ` +
        `— run \`bun run scripts/refresh-schemas-snapshot-manifest.ts\``,
      missingInManifest: drift.missingInManifest.length,
      missingOnDisk: drift.missingOnDisk.length,
      hashMismatches: drift.hashMismatches.length,
      countsMatch: drift.countsMatch,
    };
  } catch (err) {
    return {
      status: "fail",
      details: `schemas-snapshot MANIFEST check error: ${err instanceof Error ? err.message : String(err)}`,
      missingInManifest: 0,
      missingOnDisk: 0,
      hashMismatches: 0,
      countsMatch: false,
    };
  }
}
