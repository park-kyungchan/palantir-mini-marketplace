/**
 * Repository-level guard against a whole plugin shipping ungated.
 *
 * `ci/authorized-plugin-roots.json` is the registry of `plugins/*` roots
 * the marketplace recognizes. Until this gate existed, being listed there
 * did not imply the CI workflow actually did anything with a plugin:
 * `plugins/palantir-ontology` was a registered authorized root but was
 * never typechecked or tested by
 * `.github/workflows/palantir-mini-integrity.yml`, which covered only
 * `plugins/palantir-mini`.
 *
 * This is DELIBERATELY a coarse textual check: for every authorized
 * plugin root, assert the workflow file's raw text mentions that root's
 * path at least once. It does NOT parse the workflow into steps, does NOT
 * validate what a matching step actually runs (install/typecheck/test
 * presence, ordering, exit-code handling), and does NOT check step
 * semantics in any way. Its only job is to make it structurally
 * impossible for a newly authorized plugin root to be entirely invisible
 * to CI, the way plugins/palantir-ontology was before this gate existed.
 */
import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..");
const AUTHORIZED_ROOTS_REGISTRY = join(REPOSITORY_ROOT, "ci", "authorized-plugin-roots.json");
const WORKFLOW_FILE = join(REPOSITORY_ROOT, ".github", "workflows", "palantir-mini-integrity.yml");

export interface AuthorizedPluginRootEntry {
  readonly path: string;
  readonly grounds: string;
}

interface AuthorizedPluginRootsFile {
  readonly authorizedPluginRoots: AuthorizedPluginRootEntry[];
}

export function loadAuthorizedRoots(registryPath: string = AUTHORIZED_ROOTS_REGISTRY): AuthorizedPluginRootEntry[] {
  const parsed = JSON.parse(readFileSync(registryPath, "utf8")) as AuthorizedPluginRootsFile;
  return parsed.authorizedPluginRoots;
}

/** Returns the authorized-root paths that the workflow text never mentions. */
export function findUncoveredPluginRoots(workflowText: string, roots: AuthorizedPluginRootEntry[]): string[] {
  return roots.filter((root) => !workflowText.includes(root.path)).map((root) => root.path);
}

export function main(): void {
  const roots = loadAuthorizedRoots();
  const workflowText = readFileSync(WORKFLOW_FILE, "utf8");
  const uncovered = findUncoveredPluginRoots(workflowText, roots);

  if (uncovered.length > 0) {
    const workflowRelPath = relative(REPOSITORY_ROOT, WORKFLOW_FILE);
    for (const path of uncovered) {
      console.error(`[plugin-ci-coverage] ${path}: no step in ${workflowRelPath} references this plugin root`);
    }
    process.exit(1);
  }

  console.log(
    `[plugin-ci-coverage] OK: ${roots.length} authorized plugin root(s) covered by CI ` +
      `(${roots.map((r) => r.path).join(", ")})`,
  );
}

if (import.meta.main) main();
