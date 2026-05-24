// palantir-mini — lib/runtime-overlay/schema-resolve.ts
// R-ID A.W6 — plugin-first schema path resolver with external dev override
//
// Authority: rule 08 §Schema + Codegen Authority (schema as semver-tracked interface)
//            rule 10 §5-dim envelope (event emission on fallback)
//
// Resolver pattern:
//   1. Prefer runtime-overlay/schemas-snapshot/. This makes the plugin a
//      portable substrate and keeps external ~/.claude/schemas/ as an authoring
//      mirror rather than a runtime dependency.
//   2. If PALANTIR_MINI_DEV_PREFER_EXTERNAL_SCHEMAS=1, check external
//      ~/.claude/schemas/ for package name + version compatibility and return
//      "external-dev-override" when compatible.
//   3. If the dev override is requested but missing or incompatible, return the
//      plugin snapshot with provenance reason "missing" or "version-mismatch".
//
// compatibleSchemaVersions:
//   Read from plugin's own package.json#compatibleSchemaVersions (semver range string).
//   If not specified, any version of @palantirKC/claude-schemas is accepted as
//   "compatible" (permissive fallback for development environments).
//
// This resolver is synchronous-friendly because it is invoked during hook init
// and must not add async latency to the hot path. Emit is fire-and-forget.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../config/root";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Outcome of schema path resolution. */
export type SchemaSource = "plugin-snapshot" | "external-dev-override";

/** Why the selected source was chosen. */
export type SchemaProvenance =
  | "plugin-default"
  | "external-dev-override"
  | "missing"
  | "version-mismatch";

export interface SchemaResolveResult {
  /** "plugin-snapshot" or "external-dev-override". */
  source: SchemaSource;
  /** Detailed source provenance for audit and self-check output. */
  provenance: SchemaProvenance;
  /** Absolute path to the resolved schemas root directory. */
  resolvedPath: string;
  /** Version string found in the external package.json, or null if not found. */
  externalVersion: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPECTED_PACKAGE_NAME = "@palantirKC/claude-schemas";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read package.json at a path, returning null on failure. */
function readPackageJson(pkgPath: string): Record<string, unknown> | null {
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Parse a semver string into [major, minor, patch] integers.
 * Returns null on parse failure.
 */
function parseSemver(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  // match[1..3] are guaranteed non-undefined when the regex matched
  return [parseInt(match[1]!, 10), parseInt(match[2]!, 10), parseInt(match[3]!, 10)];
}

/**
 * Check whether actualVersion satisfies a range string.
 *
 * Supports only these range formats (sufficient for our use case):
 *   - ">=X.Y.Z <A.B.C"  (most common: peer dep range)
 *   - "^X.Y.Z"           (caret range: same major)
 *   - "~X.Y.Z"           (tilde range: same major.minor)
 *   - "*"                (wildcard: any version)
 *   - exact "X.Y.Z"
 *
 * Returns true when actualVersion satisfies the range.
 * Returns true (permissive) when the range cannot be parsed.
 */
function satisfiesRange(actualVersion: string, range: string): boolean {
  const trimmed = range.trim();
  if (trimmed === "*" || trimmed === "") return true;

  const actual = parseSemver(actualVersion);
  if (actual === null) return true; // cannot determine — be permissive

  // >=X.Y.Z <A.B.C
  const rangeMatch = /^>=(\d+\.\d+\.\d+)\s+<(\d+\.\d+\.\d+)$/.exec(trimmed);
  if (rangeMatch) {
    // rangeMatch[1] and rangeMatch[2] are guaranteed non-undefined when the regex matched
    const lower = parseSemver(rangeMatch[1]!);
    const upper = parseSemver(rangeMatch[2]!);
    if (lower === null || upper === null) return true;
    const aboveLower =
      actual[0] > lower[0] ||
      (actual[0] === lower[0] && actual[1] > lower[1]) ||
      (actual[0] === lower[0] && actual[1] === lower[1] && actual[2] >= lower[2]);
    const belowUpper =
      actual[0] < upper[0] ||
      (actual[0] === upper[0] && actual[1] < upper[1]) ||
      (actual[0] === upper[0] && actual[1] === upper[1] && actual[2] < upper[2]);
    return aboveLower && belowUpper;
  }

  // ^X.Y.Z — same major
  const caretMatch = /^\^(\d+\.\d+\.\d+)$/.exec(trimmed);
  if (caretMatch) {
    const lower = parseSemver(caretMatch[1]!);
    if (lower === null) return true;
    return actual[0] === lower[0] && (
      actual[1] > lower[1] ||
      (actual[1] === lower[1] && actual[2] >= lower[2])
    );
  }

  // ~X.Y.Z — same major.minor
  const tildeMatch = /^~(\d+\.\d+\.\d+)$/.exec(trimmed);
  if (tildeMatch) {
    const lower = parseSemver(tildeMatch[1]!);
    if (lower === null) return true;
    return actual[0] === lower[0] && actual[1] === lower[1] && actual[2] >= lower[2];
  }

  // exact
  const exact = parseSemver(trimmed);
  if (exact !== null) {
    return actual[0] === exact[0] && actual[1] === exact[1] && actual[2] === exact[2];
  }

  // unparseable range — be permissive
  return true;
}

/**
 * Fire-and-forget emit for schema_snapshot_fallback_used advisory.
 * Uses dynamic import to avoid circular dependency on scripts/log.ts at load time.
 */
async function emitSnapshotFallback(resolvedPath: string, reason: string): Promise<void> {
  try {
    const logMod = await import("../../scripts/log");
    await logMod.emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: false,
        errorClass: "schema_snapshot_fallback_used",
      },
      toolName: "schema-resolve",
      cwd: process.env.PALANTIR_MINI_PROJECT ?? process.cwd(),
      identity: "monitor",
      reasoning: `schema-resolve: external schemas missing or incompatible; using plugin-snapshot fallback at ${resolvedPath}. Reason: ${reason}. Production deployments should have external schemas present.`,
      memoryLayers: ["semantic"],
    });
  } catch {
    // best-effort; never blocks the resolver
  }
}

// ─── Main resolver ───────────────────────────────────────────────────────────

const HOME = process.env.HOME ?? os.homedir();
const PLUGIN_ROOT = resolvePalantirMiniRoot();

/**
 * Resolve the schemas root path.
 *
 * Returns the plugin-owned snapshot by default. External schemas are used only
 * when PALANTIR_MINI_DEV_PREFER_EXTERNAL_SCHEMAS=1 and the external package is
 * present + compatible.
 */
export async function resolveSchemaPath(): Promise<SchemaResolveResult> {
  const externalSchemasDir = path.join(HOME, ".claude", "schemas");
  const snapshotDir = path.join(
    PLUGIN_ROOT,
    "runtime-overlay",
    "schemas-snapshot",
  );

  const preferExternal = process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_SCHEMAS === "1";
  if (!preferExternal) {
    return {
      source: "plugin-snapshot",
      provenance: "plugin-default",
      resolvedPath: snapshotDir,
      externalVersion: null,
    };
  }

  // Dev override: check external schemas presence.
  const externalPkgPath = path.join(externalSchemasDir, "package.json");
  const externalPkg = readPackageJson(externalPkgPath);

  if (externalPkg === null) {
    await emitSnapshotFallback(snapshotDir, "external dev override requested but ~/.claude/schemas/package.json was not found");
    return {
      source: "plugin-snapshot",
      provenance: "missing",
      resolvedPath: snapshotDir,
      externalVersion: null,
    };
  }

  // Verify package name.
  if (externalPkg.name !== EXPECTED_PACKAGE_NAME) {
    await emitSnapshotFallback(
      snapshotDir,
      `external package.json#name "${String(externalPkg.name)}" !== "${EXPECTED_PACKAGE_NAME}"`,
    );
    return {
      source: "plugin-snapshot",
      provenance: "version-mismatch",
      resolvedPath: snapshotDir,
      externalVersion: null,
    };
  }

  const externalVersion =
    typeof externalPkg.version === "string" ? externalPkg.version : null;

  // Check version compatibility.
  const pluginPkgPath = path.join(PLUGIN_ROOT, "package.json");
  const pluginPkg = readPackageJson(pluginPkgPath);
  const compatRange =
    pluginPkg !== null && typeof pluginPkg.compatibleSchemaVersions === "string"
      ? pluginPkg.compatibleSchemaVersions
      : "*";

  if (externalVersion !== null && !satisfiesRange(externalVersion, compatRange)) {
    await emitSnapshotFallback(
      snapshotDir,
      `external schema version "${externalVersion}" does not satisfy compatibleSchemaVersions range "${compatRange}"`,
    );
    return {
      source: "plugin-snapshot",
      provenance: "version-mismatch",
      resolvedPath: snapshotDir,
      externalVersion,
    };
  }

  return {
    source: "external-dev-override",
    provenance: "external-dev-override",
    resolvedPath: externalSchemasDir,
    externalVersion,
  };
}
