// palantir-mini v2.1.2 — MCP tool handler: verify_schema_pin
// Domain: LEARN (ProjectSchemaPin prim-learn-06)
//
// Verifies consumer project's peerDep pin on @palantirKC/claude-schemas.
// Authority chain: rules/08-schema-versioning.md → schemas/ontology/primitives/project-schema-pin.ts
//
// v2.1.2 change (A1 fix — PR #?): `INSTALLED_SCHEMA_VERSION` + `PLUGIN_COMPATIBLE_SCHEMA_RANGE`
// no longer hardcoded. They resolve dynamically from the on-disk
// `@palantirKC/claude-schemas/package.json` version + the plugin's
// `.claude-plugin/plugin.json` `compatibleSchemaVersions` range. Prior
// versions hardcoded `^1.12.0` / `"1.12.0"` which diverged from the actual
// v1.17.0 / ">=1.15.0 <2.0.0" state for 4+ schema bumps.

import * as fs from "fs";
import * as path from "path";
import {
  PROJECT_SCHEMA_PIN_REGISTRY,
  projectSchemaPinRid,
} from "#schemas/ontology/primitives/project-schema-pin";
import type { ProjectSchemaPinDeclaration } from "#schemas/ontology/primitives/project-schema-pin";

// Fallback constants — used only when package.json / plugin.json cannot be resolved
// (e.g. tests running without the full monorepo layout). Kept as a floor.
const FALLBACK_PLUGIN_RANGE = ">=1.15.0 <2.0.0";
const FALLBACK_INSTALLED    = "1.17.0";

interface VerifySchemaPinArgs {
  project: string;
  pluginCompatibleSchemaRange?: string;
}

interface VerifySchemaPinResult {
  compatible:      boolean;
  pinnedSchema:    string;
  installedSchema: string;
  recommendedPin?: string;
  reason:          string;
}

export function parseSemver(v: string): [number, number, number] {
  const clean = v.replace(/^[\^~>=<\s]+/, "").trim();
  const parts = clean.split(".").map((p) => parseInt(p, 10));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function cmpSemver(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Returns true if `pinned` (e.g. "^1.15.0", "~1.17.0", "1.17.2") is satisfied
 * by `range`. Supports:
 *   - `^X.Y.Z`           → [X.Y.Z, (X+1).0.0)
 *   - `~X.Y.Z`           → [X.Y.Z, X.(Y+1).0)
 *   - `>=X.Y.Z <A.B.C`   → [X.Y.Z, A.B.C)
 *   - bare `X.Y.Z`       → exactly X.Y.Z
 *
 * Naive but sufficient for the pin formats the monorepo uses; a full semver
 * grammar would add dependency cost without value here.
 */
export function semverSatisfies(pinned: string, range: string): boolean {
  const rangeCompound = range.trim().match(/^>=\s*([\d.]+)\s+<\s*([\d.]+)$/);
  if (rangeCompound) {
    const lo   = parseSemver(rangeCompound[1]!);
    const hi   = parseSemver(rangeCompound[2]!);
    const pinLo = pinnedLowerBound(pinned);
    const pinHi = pinnedUpperBound(pinned);
    // Pin is satisfied iff pin's full range intersects the plugin range AND
    // pin's lower bound is >= range lower bound.
    return cmpSemver(pinLo, lo) >= 0 && cmpSemver(pinLo, hi) < 0 && cmpSemver(pinHi, lo) > 0;
  }
  if (range.startsWith("^")) {
    const [minMaj, minMin, minPatch] = parseSemver(range);
    const pinLo = pinnedLowerBound(pinned);
    return pinLo[0] === minMaj && cmpSemver(pinLo, [minMaj, minMin, minPatch]) >= 0;
  }
  if (range.startsWith("~")) {
    const [minMaj, minMin, minPatch] = parseSemver(range);
    const pinLo = pinnedLowerBound(pinned);
    return pinLo[0] === minMaj && pinLo[1] === minMin && cmpSemver(pinLo, [minMaj, minMin, minPatch]) >= 0;
  }
  const bare = parseSemver(range);
  const pinLo = pinnedLowerBound(pinned);
  return cmpSemver(pinLo, bare) === 0;
}

function pinnedLowerBound(pinned: string): [number, number, number] {
  return parseSemver(pinned);
}

function pinnedUpperBound(pinned: string): [number, number, number] {
  const [maj, min, patch] = parseSemver(pinned);
  if (pinned.startsWith("^")) return [maj + 1, 0, 0];
  if (pinned.startsWith("~")) return [maj, min + 1, 0];
  return [maj, min, patch + 1];
}

function readPackageJsonPin(projectPath: string): string | null {
  const pkgPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    const peer = (pkg.peerDependencies ?? {}) as Record<string, string>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const peerOrDep = peer["@palantirKC/claude-schemas"] ?? deps["@palantirKC/claude-schemas"];
    if (typeof peerOrDep === "string" && peerOrDep.length > 0) return peerOrDep;
    // sprint-055 W1.B — workspace-root awareness. When the project is the
    // monorepo root (declares `workspaces`), peerDep enforcement does not
    // apply — schemas are consumed via the workspace symlink. Return a
    // sentinel string that verifySchemaPin() recognises as compatible.
    const workspaces = pkg.workspaces;
    const isWorkspaceRoot =
      Array.isArray(workspaces)
        ? workspaces.length > 0
        : (typeof workspaces === "object" && workspaces !== null &&
           Array.isArray((workspaces as { packages?: unknown }).packages));
    if (isWorkspaceRoot) return "workspace-root";
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve installed schema version from the on-disk schema package.json.
 * Walks up from this handler's module path to the monorepo root's
 * `.claude/schemas/package.json`. Fallback returns FALLBACK_INSTALLED.
 */
export function resolveInstalledSchemaVersion(): string {
  try {
    const schemasPkgPath = path.resolve(
      __dirname,
      "../..",
      "runtime-overlay",
      "schemas-snapshot",
      "package.json",
    );
    if (fs.existsSync(schemasPkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(schemasPkgPath, "utf8")) as Record<string, unknown>;
      const v = pkg.version;
      if (typeof v === "string" && v.length > 0) return v;
    }
  } catch { /* fallthrough */ }
  return FALLBACK_INSTALLED;
}

/**
 * Resolve plugin's compatibleSchemaVersions range from plugin.json.
 * Fallback returns FALLBACK_PLUGIN_RANGE.
 */
export function resolvePluginCompatibleRange(): string {
  try {
    const pluginJsonPath = path.resolve(__dirname, "../..", ".claude-plugin", "plugin.json");
    if (fs.existsSync(pluginJsonPath)) {
      const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8")) as Record<string, unknown>;
      const range = pluginJson.compatibleSchemaVersions;
      if (typeof range === "string" && range.length > 0) return range;
    }
  } catch { /* fallthrough */ }
  return FALLBACK_PLUGIN_RANGE;
}

export default async function verifySchemaPin(rawArgs: unknown): Promise<VerifySchemaPinResult> {
  const args = (rawArgs ?? {}) as VerifySchemaPinArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("verify_schema_pin: `project` is required");
  }

  const range           = args.pluginCompatibleSchemaRange ?? resolvePluginCompatibleRange();
  const pinnedSchema    = readPackageJsonPin(args.project) ?? "not-found";
  const installedSchema = resolveInstalledSchemaVersion();

  let compatible:     boolean;
  let reason:         string;
  let recommendedPin: string | undefined;

  if (pinnedSchema === "workspace-root") {
    // sprint-055 W1.B — monorepo root case. Schemas are consumed via the
    // workspace symlink, not peerDep enforcement. PASS by structure.
    compatible = true;
    reason     = `workspace-root: peerDep enforcement not applicable (schemas consumed via workspace symlink) — installed ${installedSchema}`;
  } else if (pinnedSchema === "not-found") {
    compatible     = false;
    reason         = `No @palantirKC/claude-schemas pin found in ${args.project}/package.json`;
    recommendedPin = range;
  } else if (!semverSatisfies(pinnedSchema, range)) {
    compatible     = false;
    reason         = `Pin "${pinnedSchema}" does not satisfy plugin-required range "${range}"`;
    recommendedPin = range;
  } else {
    compatible = true;
    reason     = `Pin "${pinnedSchema}" satisfies "${range}" — installed ${installedSchema}`;
  }

  const decl: ProjectSchemaPinDeclaration = {
    rid:                  projectSchemaPinRid(`schema-pin:${args.project}`),
    projectRid:           args.project,
    pinnedSchema,
    installedSchema,
    compatibilityVerdict: compatible ? "compatible" : "incompatible",
    lastResolvedAt:       new Date().toISOString(),
    reason,
  };
  PROJECT_SCHEMA_PIN_REGISTRY.register(decl);

  return { compatible, pinnedSchema, installedSchema, recommendedPin, reason };
}
