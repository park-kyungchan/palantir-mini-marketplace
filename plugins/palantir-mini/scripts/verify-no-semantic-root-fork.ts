import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "..");
const REPOSITORY_ROOT = resolve(PLUGIN_ROOT, "../..");
const PLUGIN_SOURCE_REL = "plugins/palantir-mini";

const ALLOWED_ROOT_ENTRIES = new Set([
  ".agents",
  ".git",
  ".github",
  ".palantir-mini",
  "ci",
  "plugins",
  "README.md",
]);

const SEMANTIC_ROOT_ENTRY_NAMES = new Set([
  ".codex-plugin",
  ".mcp.json",
  "agents",
  "bridge",
  "codex-skills",
  "contracts",
  "core",
  "eval-suites",
  "hooks",
  "lib",
  "managed-settings.d",
  "runtime-overlay",
  "schemas",
  "skills",
  "src",
  "tests",
  "workbenches",
]);

export interface SemanticRootForkFinding {
  readonly path: string;
  readonly reasonCode: "semantic_root_entry" | "plugin_source_fork";
  readonly message: string;
}

function toRepoRel(repositoryRoot: string, path: string): string {
  return relative(repositoryRoot, path).replace(/\\/g, "/");
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function findSemanticRootForks(
  repositoryRoot = REPOSITORY_ROOT,
): SemanticRootForkFinding[] {
  const findings: SemanticRootForkFinding[] = [];
  const pluginSource = join(repositoryRoot, PLUGIN_SOURCE_REL);

  if (!existsSync(pluginSource)) {
    findings.push({
      path: PLUGIN_SOURCE_REL,
      reasonCode: "plugin_source_fork",
      message: "Canonical plugin source root is missing.",
    });
    return findings;
  }

  for (const entry of readdirSync(repositoryRoot, { withFileTypes: true })) {
    const name = entry.name;
    if (ALLOWED_ROOT_ENTRIES.has(name)) continue;
    if (SEMANTIC_ROOT_ENTRY_NAMES.has(name)) {
      findings.push({
        path: name,
        reasonCode: "semantic_root_entry",
        message: `Repository root must stay marketplace-only; ${name} belongs under ${PLUGIN_SOURCE_REL}/.`,
      });
    }
  }

  const pluginsRoot = join(repositoryRoot, "plugins");
  if (isDirectory(pluginsRoot)) {
    for (const entry of readdirSync(pluginsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "palantir-mini") continue;
      const candidate = join(pluginsRoot, entry.name);
      for (const semanticEntry of SEMANTIC_ROOT_ENTRY_NAMES) {
        if (existsSync(join(candidate, semanticEntry))) {
          findings.push({
            path: toRepoRel(repositoryRoot, candidate),
            reasonCode: "plugin_source_fork",
            message:
              `Unexpected plugin-like semantic fork ${basename(candidate)} found outside ${PLUGIN_SOURCE_REL}/.`,
          });
          break;
        }
      }
    }
  }

  return findings;
}

export function main(): void {
  const findings = findSemanticRootForks();
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`[semantic-root-fork] ${finding.path}: ${finding.message}`);
    }
    process.exit(1);
  }
  console.log("[semantic-root-fork] OK: repository root is marketplace-only");
}

if (import.meta.main) main();
