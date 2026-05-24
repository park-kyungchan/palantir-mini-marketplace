/**
 * palantir-mini lib/fde-build/naming-audit-runner.ts
 *
 * Read-only naming-audit runner. Recursively walks projectRoot, applies
 * allow/deny glob filters, scans each matched file line-by-line for baseline
 * term hits, and returns a NamingAuditReport.
 *
 * HARD INVARIANTS:
 *   1. ZERO fs.writeFile / fs.appendFile / writeFileSync calls in this module.
 *      Report writing is caller responsibility (skill invocation site).
 *   2. DENY_GLOBS must include src/generated and node_modules deny patterns.
 *   3. Files matching any DENY_GLOB are never opened, read, or reported on.
 *   4. maxFindings cap prevents unbounded memory usage on large repos.
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 2.B
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  type NamingAuditFinding,
  type NamingAuditReport,
  FDE_NAMING_CLASSIFICATION_SCHEMA_VERSION,
  NAMING_TERM_BASELINE_TABLE,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-naming-classification";
import {
  classifyTermHit,
  getBaselineTermSpecs,
  resetFindingCounter,
} from "./naming-classifier";

// =============================================================================
// Glob lists
// =============================================================================

/** Allow-list of glob patterns to scan (relative to projectRoot).
 *  Only files matching at least one allow pattern are scanned. */
export const NAMING_AUDIT_ALLOW_GLOBS: readonly string[] = [
  "**/*.md",
  "lib/**/*.ts",
  "skills/**/SKILL.md",
  "agents/**/*.md",
  "README.md",
  "CHANGELOG.md",
  "runtime-overlay/schemas-snapshot/**/*.ts",
] as const;

/** Deny-list: files matching any of these globs are never scanned.
 *  Deny takes precedence over allow. */
export const NAMING_AUDIT_DENY_GLOBS: readonly string[] = [
  "**/src/generated/**",
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
] as const;

// =============================================================================
// Input shape
// =============================================================================

export interface NamingAuditRunnerInput {
  /** Absolute path to the project root. */
  readonly projectRoot: string;
  /** Cap on findings to collect (default 200). */
  readonly maxFindings?: number;
  /** ISO timestamp override (default: now). */
  readonly nowIso?: string;
}

// =============================================================================
// Internal glob matchers
// =============================================================================

/** Match a relative path against a single glob pattern.
 *
 *  Supports:
 *    - "**\/dir\/**" pattern: checks if any path segment equals `dir`
 *      (handles node_modules, dist, .git, generated subdirs).
 *    - Standard ** / * glob expansion via regex for other patterns.
 */
function matchesGlob(relPath: string, glob: string): boolean {
  // Fast path: **/segment/** — check if any segment matches
  const segMatch = glob.match(/^\*\*\/([^*]+?)\/\*\*$/);
  if (segMatch) {
    const dir = segMatch[1] as string;
    const parts = relPath.split("/");
    return parts.some((seg) => seg === dir) || relPath.startsWith(dir + "/");
  }

  // General regex path
  let pattern = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  pattern = pattern.replace(/\*\*\//g, "(?:.*/)?");
  pattern = pattern.replace(/\/\*\*/g, "(/.*)?");
  pattern = pattern.replace(/\*\*/g, ".*");
  pattern = pattern.replace(/\*/g, "[^/]*");
  return new RegExp(`^${pattern}$`, "i").test(relPath);
}

function matchesAnyGlob(relPath: string, globs: readonly string[]): boolean {
  for (const glob of globs) {
    if (matchesGlob(relPath, glob)) return true;
  }
  return false;
}

// =============================================================================
// Recursive file walker
// =============================================================================

function walkDir(
  dir: string,
  projectRoot: string,
  results: string[],
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // Unreadable directory — skip silently.
    return;
  }

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    const relPath = path.relative(projectRoot, absPath);

    if (matchesAnyGlob(relPath, NAMING_AUDIT_DENY_GLOBS)) continue;

    if (entry.isDirectory()) {
      walkDir(absPath, projectRoot, results);
    } else if (entry.isFile()) {
      if (matchesAnyGlob(relPath, NAMING_AUDIT_ALLOW_GLOBS)) {
        results.push(absPath);
      }
    }
  }
}

// =============================================================================
// Per-file scanner
// =============================================================================

/** Terms to look for — extracted from baseline table for performance. */
const BASELINE_TERMS = NAMING_TERM_BASELINE_TABLE.map((s) => s.term);

/**
 * Scan a single file for term hits. Returns an array of findings (may be
 * empty if no terms found or file is unreadable).
 * The remaining capacity is used to cap finds per file.
 */
function scanFile(
  absPath: string,
  projectRoot: string,
  remainingCapacity: number,
): NamingAuditFinding[] {
  let content: string;
  try {
    content = fs.readFileSync(absPath, "utf-8");
  } catch {
    return [];
  }

  const relPath = path.relative(projectRoot, absPath);
  const lines = content.split("\n");
  const findings: NamingAuditFinding[] = [];

  for (let i = 0; i < lines.length && findings.length < remainingCapacity; i++) {
    const lineText: string = lines[i] ?? "";
    for (const term of BASELINE_TERMS) {
      if (findings.length >= remainingCapacity) break;
      // Whole-word match: term surrounded by non-alphanumeric (or start/end of line).
      const termEscaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?<![A-Za-z0-9_])${termEscaped}(?![A-Za-z0-9_])`);
      if (re.test(lineText)) {
        const finding = classifyTermHit({
          term,
          location: relPath,
          line: i + 1,
          excerpt: lineText.trim(),
        });
        if (finding) findings.push(finding);
      }
    }
  }

  return findings;
}

// =============================================================================
// Main runner
// =============================================================================

/**
 * Run the naming audit against projectRoot.
 *
 * PURE READ-ONLY — never writes source files.
 * Returns a NamingAuditReport which can then be rendered to markdown by
 * naming-report-renderer.ts.
 */
export async function runNamingAudit(
  input: NamingAuditRunnerInput,
): Promise<NamingAuditReport> {
  const { projectRoot, maxFindings = 200, nowIso = new Date().toISOString() } =
    input;

  // Reset finding counter so IDs are stable across repeated calls in tests.
  resetFindingCounter();

  // Collect all matching files.
  const allFiles: string[] = [];
  walkDir(projectRoot, projectRoot, allFiles);

  // Scan each file for term hits up to maxFindings cap.
  const allFindings: NamingAuditFinding[] = [];
  let totalFindings = 0;

  for (const absPath of allFiles) {
    if (allFindings.length >= maxFindings) break;
    const capacity = maxFindings - allFindings.length;
    const fileFindings = scanFile(absPath, projectRoot, capacity);
    totalFindings += fileFindings.length;
    allFindings.push(...fileFindings);
  }

  // Aggregate per-term counts from collected findings.
  const termCountMap = new Map<string, number>();
  for (const f of allFindings) {
    termCountMap.set(f.term, (termCountMap.get(f.term) ?? 0) + 1);
  }

  const termCounts = getBaselineTermSpecs().map((spec) => ({
    term: spec.term,
    count: termCountMap.get(spec.term) ?? 0,
    classification: spec.classification,
  }));

  const legacyCount = allFindings.filter(
    (f) => f.classification === "legacy-user-facing",
  ).length;
  const compatCount = allFindings.filter(
    (f) => f.classification === "compatibility-identifier",
  ).length;

  const executiveSummary =
    `Scanned ${allFiles.length} file(s). Found ${allFindings.length} naming findings ` +
    `(${legacyCount} legacy-user-facing, ${compatCount} compatibility-identifier). ` +
    `maxFindings cap: ${maxFindings}. Total before cap: ${totalFindings}. ` +
    `Compatibility identifiers are preserved verbatim per brief §8.3.`;

  const reportRid = crypto.randomUUID();

  const report: NamingAuditReport = {
    schemaVersion: FDE_NAMING_CLASSIFICATION_SCHEMA_VERSION,
    reportRid,
    project: projectRoot,
    generatedAt: nowIso,
    readOnly: true,
    scannedGlobs: [...NAMING_AUDIT_ALLOW_GLOBS],
    deniedGlobs: [...NAMING_AUDIT_DENY_GLOBS],
    termCounts,
    findings: allFindings,
    maxFindings,
    totalFindings,
    executiveSummary,
    compatibilityIdentifiersPreserved: true,
  };

  return report;
}
