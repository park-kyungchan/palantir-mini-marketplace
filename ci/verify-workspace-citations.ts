/**
 * Repository-level guard against dangling cross-repo citations.
 *
 * `plugins/<name>/src/**`, `plugins/<name>/docs/**`, and top-level
 * `plugins/<name>/*.md` files sometimes cite campaign-workspace artifacts by their
 * workspace-relative path, e.g. `outputs/p230-state-migration-census.md`
 * (a real example of the failure mode this gate closes:
 * `plugins/palantir-ontology/src/migration/state-families.ts` cites
 * `outputs/p230-legacy-surface-census.md`, which was never the real
 * filename and does not exist — nothing caught this, and it misled a
 * migration analysis).
 *
 * The campaign workspace lives in a DIFFERENT repository
 * (`harness-upstream/_workspace/2026-07-17-palantir-ontology-successor/`
 * by default, overridable via `PALANTIR_CAMPAIGN_WORKSPACE` for testing)
 * and may simply be absent on a given CI runner. Absence is not a failure
 * of this repo — this gate must SKIP (exit 0) rather than fail when the
 * workspace root itself cannot be found, and must never silently report
 * success as though it had verified something it could not see. The SKIP
 * and OK outcomes are textually distinguishable on purpose.
 *
 * Only BARE campaign-workspace-relative citations are in scope (the
 * citation pattern immediately preceded by nothing, whitespace, or
 * punctuation like a backtick/quote/paren — never by another path
 * segment). Fully-qualified citations that happen to end in one of these
 * segment names but are anchored under a different root entirely (for
 * example `~/.claude/research/palantir-vision/synthesis/<file>.md`,
 * found in plugins/palantir-mini/CHANGELOG.md) are NOT campaign-workspace
 * citations and must not be checked against the campaign workspace root.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..");
const DEFAULT_CAMPAIGN_WORKSPACE =
  "/home/palantirkc/harness-upstream/_workspace/2026-07-17-palantir-ontology-successor";

const CAMPAIGN_WORKSPACE_PREFIXES = ["outputs", "decisions", "validation", "context", "synthesis", "spawn-prompts"];
const CITATION_PATTERN = new RegExp(
  `(?<![\\w/])(?:${CAMPAIGN_WORKSPACE_PREFIXES.join("|")})/[\\w.-]+\\.md`,
  "g",
);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".html", ".yml", ".yaml"]);

export interface CitationFinding {
  readonly file: string; // repo-relative path
  readonly line: number; // 1-indexed
  readonly citedPath: string; // e.g. "outputs/p230-legacy-surface-census.md"
}

function walkTextFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTextFiles(full, out);
    } else if (st.isFile() && SCAN_EXTENSIONS.has(extname(entry))) {
      out.push(full);
    }
  }
}

/** plugins/<name>/src/**, plugins/<name>/docs/**, and top-level plugins/<name>/*.md. */
function collectScanFiles(repositoryRoot: string): string[] {
  const files: string[] = [];
  const pluginsDir = join(repositoryRoot, "plugins");
  if (!existsSync(pluginsDir)) return files;

  for (const pluginName of readdirSync(pluginsDir)) {
    const pluginDir = join(pluginsDir, pluginName);
    if (!statSync(pluginDir).isDirectory()) continue;

    for (const entry of readdirSync(pluginDir)) {
      const entryPath = join(pluginDir, entry);
      if (entry.endsWith(".md") && statSync(entryPath).isFile()) files.push(entryPath);
    }

    for (const sub of ["src", "docs"]) {
      const subDir = join(pluginDir, sub);
      if (existsSync(subDir)) walkTextFiles(subDir, files);
    }
  }
  return files;
}

export function findCitations(repositoryRoot: string = REPOSITORY_ROOT): CitationFinding[] {
  const findings: CitationFinding[] = [];
  for (const file of collectScanFiles(repositoryRoot)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, idx) => {
      const re = new RegExp(CITATION_PATTERN.source, "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(line)) !== null) {
        findings.push({ file: relative(repositoryRoot, file), line: idx + 1, citedPath: match[0] });
      }
    });
  }
  return findings;
}

export function findDanglingCitations(
  campaignWorkspaceRoot: string,
  repositoryRoot: string = REPOSITORY_ROOT,
): { citations: CitationFinding[]; dangling: CitationFinding[] } {
  const citations = findCitations(repositoryRoot);
  const dangling = citations.filter((c) => !existsSync(join(campaignWorkspaceRoot, c.citedPath)));
  return { citations, dangling };
}

export function main(): void {
  const campaignWorkspaceRoot = process.env.PALANTIR_CAMPAIGN_WORKSPACE ?? DEFAULT_CAMPAIGN_WORKSPACE;

  if (!existsSync(campaignWorkspaceRoot)) {
    console.log(
      `[workspace-citations] SKIP: campaign workspace root not found (${campaignWorkspaceRoot}) — ` +
        "it lives in a different repo and is not available on this runner; no citations were verified.",
    );
    process.exit(0);
  }

  const { citations, dangling } = findDanglingCitations(campaignWorkspaceRoot);
  if (dangling.length > 0) {
    for (const finding of dangling) {
      console.error(`${finding.file}:${finding.line}: ${finding.citedPath}`);
    }
    console.error(
      `[workspace-citations] FAIL: ${dangling.length} dangling citation(s) against ${campaignWorkspaceRoot}`,
    );
    process.exit(1);
  }

  console.log(`[workspace-citations] OK: ${citations.length} citation(s) verified against ${campaignWorkspaceRoot}`);
}

if (import.meta.main) main();
