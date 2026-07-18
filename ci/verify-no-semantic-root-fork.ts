/**
 * Repository-level wrapper around the UNCHANGED legacy detector
 * `plugins/palantir-mini/scripts/verify-no-semantic-root-fork.ts`.
 *
 * The legacy detector asserts a single-plugin topology: any `plugins/*`
 * directory other than `palantir-mini` containing a semantic entry
 * (`src`, `tests`, `contracts`, `schemas`, ...) is flagged
 * `plugin_source_fork`. The campaign Goal of record (2026-07-18) authorizes
 * a second, successor semantic root (`plugins/palantir-ontology`) on this
 * marketplace through merged PM-1..PM-5. This wrapper extends the guard at
 * the repository level instead of editing the protected legacy file:
 *
 *   - `plugin_source_fork` findings whose path is a registered authorized
 *     root (ci/authorized-plugin-roots.json) are filtered OUT.
 *   - `semantic_root_entry` findings (repository-root semantic surfaces)
 *     are NEVER filtered.
 *   - any `plugin_source_fork` finding whose path is NOT a registered
 *     authorized root (a genuine third fork) is NEVER filtered.
 *
 * See decisions/pm1-ci-gate-adjudication.md for the full adjudication.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  findSemanticRootForks,
  type SemanticRootForkFinding,
} from "../plugins/palantir-mini/scripts/verify-no-semantic-root-fork";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..");
const AUTHORIZED_ROOTS_REGISTRY = join(REPOSITORY_ROOT, "ci", "authorized-plugin-roots.json");

interface AuthorizedPluginRootEntry {
  readonly path: string;
  readonly grounds: string;
}

interface AuthorizedPluginRootsFile {
  readonly authorizedPluginRoots: AuthorizedPluginRootEntry[];
}

function loadAuthorizedRoots(registryPath = AUTHORIZED_ROOTS_REGISTRY): Set<string> {
  const parsed = JSON.parse(readFileSync(registryPath, "utf8")) as AuthorizedPluginRootsFile;
  return new Set(parsed.authorizedPluginRoots.map((entry) => entry.path));
}

export function findUnauthorizedSemanticRootForks(
  repositoryRoot = REPOSITORY_ROOT,
): SemanticRootForkFinding[] {
  const authorizedRoots = loadAuthorizedRoots();
  const findings = findSemanticRootForks(repositoryRoot);
  return findings.filter((finding) => {
    if (finding.reasonCode !== "plugin_source_fork") return true;
    return !authorizedRoots.has(finding.path);
  });
}

export function main(): void {
  const findings = findUnauthorizedSemanticRootForks();
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`[semantic-root-fork] ${finding.path}: ${finding.message}`);
    }
    process.exit(1);
  }
  const authorizedRoots = [...loadAuthorizedRoots()].join(", ");
  console.log(
    `[semantic-root-fork] OK: repository root is marketplace-only (authorized roots: ${authorizedRoots})`,
  );
}

if (import.meta.main) main();
