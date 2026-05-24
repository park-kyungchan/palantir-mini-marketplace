// palantir-mini — consumer peerDep scanner helper
// Enumerates consumer project package.json files and extracts
// their declared peerDependency range for @palantirKC/claude-schemas.
//
// Used by pm_plugin_self_check to enforce consumerPeerDepResult axis (I.7).
//
// v1.1.0 (sprint-060 W2.3 / R6-F17): also scan ~/.claude/plugins/*/package.json
//   to detect cross-plugin peerDep alignment issues. A plugin that pins
//   @palantirKC/claude-schemas to an incompatible range would fail silently
//   until a schema bump exposes the mismatch at runtime.
//
// Authority:
//   - rules/08-schema-versioning.md (schema semver as tracked interface)
//   - rules/10-events-jsonl.md (5-dim envelope; this helper is non-emitting)
//   - ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.I.7
//   - ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.I.7 (R6-F17)

import * as fs from "fs";
import * as path from "path";
import { resolvePalantirMiniRoot } from "./config/root";

/** The canonical peerDependency package name for the shared schema package. */
export const SCHEMA_PACKAGE_NAME = "@palantirKC/claude-schemas";

/** Base directory containing all consumer projects (projects/*). */
const PROJECTS_ROOT = path.join("/home/palantirkc", "projects");

/** Claude compatibility plugin install directory, scanned for peer dependency drift. */
const CLAUDE_PLUGINS_ROOT = path.join("/home/palantirkc", ".claude", "plugins");

/** Canonical palantir-mini source root. */
const PALANTIR_MINI_ROOT = resolvePalantirMiniRoot();

/** Additional package.json paths to scan outside projects/ */
const EXTRA_PACKAGE_JSON_PATHS = [
  path.join(PALANTIR_MINI_ROOT, "runtime-overlay", "ontology-shared-core", "package.json"),
  path.join(PALANTIR_MINI_ROOT, "runtime-overlay", "schemas-snapshot", "package.json"),
];

export interface ConsumerPeerDepEntry {
  /** Absolute path to the package.json file. */
  projectPath: string;
  /**
   * The declared peerDependency range string for SCHEMA_PACKAGE_NAME,
   * or null if the package.json does not declare the package as a peer.
   */
  peerDepRange: string | null;
}

export interface ConsumerPeerDepScanResult {
  entries: ConsumerPeerDepEntry[];
  /** Set of distinct non-null peerDep ranges found across all consumers. */
  distinctRanges: string[];
}

/**
 * Recursively finds all package.json files under a directory,
 * skipping node_modules and .claude/worktrees subdirectories.
 */
function findPackageJsonFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isFile()) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and worktree directories to avoid scanning
      // vendored or ephemeral copies.
      if (entry.name === "node_modules") continue;
      if (entry.name === "worktrees") continue;
      if (entry.name === ".git") continue;
      results.push(...findPackageJsonFiles(fullPath));
    } else if (entry.name === "package.json") {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Extracts the peerDependency range for SCHEMA_PACKAGE_NAME from a
 * package.json file path. Returns null if not declared.
 */
function extractPeerDepRange(packageJsonPath: string): string | null {
  try {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const peerDeps = parsed["peerDependencies"];
    if (peerDeps && typeof peerDeps === "object") {
      const range = (peerDeps as Record<string, unknown>)[SCHEMA_PACKAGE_NAME];
      if (typeof range === "string") return range;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enumerate top-level package.json files under the Claude compatibility plugins root.
 * For each plugin dir under CLAUDE_PLUGINS_ROOT, return its package.json path
 * if it exists. Does NOT recurse into workspaces inside each plugin —
 * only the root-level package.json is relevant for peerDep alignment.
 *
 * sprint-060 W2.3 (R6-F17): cross-plugin peerDep alignment scan.
 */
function findPluginPackageJsonFiles(): string[] {
  const results: string[] = [];
  if (!fs.existsSync(CLAUDE_PLUGINS_ROOT)) return results;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(CLAUDE_PLUGINS_ROOT, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = path.join(CLAUDE_PLUGINS_ROOT, entry.name, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      results.push(pkgJsonPath);
    }
  }
  return results;
}

/**
 * Scans consumer project package.json files and returns the set of distinct
 * peerDep ranges declared for SCHEMA_PACKAGE_NAME.
 *
 * Scanned paths:
 *   - All package.json under /home/palantirkc/projects/** (excluding node_modules, worktrees)
 *   - ~/ontology/shared-core/package.json
 *   - ~/.claude/schemas/package.json
 *   - ~/.claude/plugins/{name}/package.json for each plugin dir (sprint-060 W2.3 R6-F17 cross-plugin scan)
 *
 * Only entries where peerDepRange is non-null are included in distinctRanges.
 * "workspace:*" ranges (used by monorepo-internal packages) are excluded from
 * the distinctRanges computation since they are not pinnable semver ranges.
 */
export function scanConsumerPeerDeps(): ConsumerPeerDepScanResult {
  const packageJsonPaths = findPackageJsonFiles(PROJECTS_ROOT);
  for (const extra of EXTRA_PACKAGE_JSON_PATHS) {
    if (fs.existsSync(extra) && !packageJsonPaths.includes(extra)) {
      packageJsonPaths.push(extra);
    }
  }

  // sprint-060 W2.3 (R6-F17): add cross-plugin package.json scanning
  for (const pluginPkg of findPluginPackageJsonFiles()) {
    if (!packageJsonPaths.includes(pluginPkg)) {
      packageJsonPaths.push(pluginPkg);
    }
  }

  const entries: ConsumerPeerDepEntry[] = packageJsonPaths.map((p) => ({
    projectPath: p,
    peerDepRange: extractPeerDepRange(p),
  }));

  // Build distinct range set: skip null and workspace:* (internal monorepo refs).
  const rangeSet = new Set<string>();
  for (const entry of entries) {
    if (
      entry.peerDepRange !== null &&
      !entry.peerDepRange.startsWith("workspace:")
    ) {
      rangeSet.add(entry.peerDepRange);
    }
  }

  return {
    entries,
    distinctRanges: Array.from(rangeSet),
  };
}
