// palantir-mini — plans-index-drift-detect hook (stub)
// Fires on: SessionStart (advisory, async)
//
// Per rule 02 v3.2.0 §Plans index drift detection (R6-F18):
// Compares <project>/.palantir-mini/plan/**/*.md filesystem listing against
// <project>/.palantir-mini/plan/BROWSE.md. Surfaces unindexed / stale-ref
// deltas as advisory. Legacy ~/.claude/plans/ remains readable provenance, but
// new durable palantir-mini synthesis belongs in the plugin-layer plan root.
//
// Authority: rule 02 (research-retrieval) v3.2.0 §Plans index drift detection
//
// STUB: full implementation by hook-builder agent. This stub satisfies:
//   - hookCitations entry in rule 02 frontmatter (rule 08 §Hook-citation citation-validate)
//   - SessionStart event emission contract (rule 10 5-dim)
//   - Advisory-only gate (no blocking; exit 0 always)

import * as fs from "fs";
import * as path from "path";
import { resolvePlanRoot } from "../lib/plan-root/resolve-plan-root";

interface HookResult {
  message: string;
  additionalContext?: string;
}

export async function run(): Promise<HookResult> {
  const plansDir = resolvePlanRoot({ projectRoot: process.cwd(), cwd: process.cwd() });
  const browseFile = path.join(plansDir, "BROWSE.md");

  if (!fs.existsSync(plansDir)) {
    return {
      message: `[plans-index-drift-detect] canonical plan root missing at ${plansDir}. Create it for durable plugin-layer plans.`,
    };
  }

  // Guard: if BROWSE.md absent, emit advisory to create it.
  if (!fs.existsSync(browseFile)) {
    return {
      message: `[plans-index-drift-detect] BROWSE.md missing in ${plansDir}. Create it to enable drift detection.`,
    };
  }

  const browseContent = fs.readFileSync(browseFile, "utf8");

  // Collect .md files recursively (exclude root BROWSE.md itself).
  const diskFiles = collectMarkdownFiles(plansDir);

  // Extract markdown refs from BROWSE.md; preserve nested relative paths.
  const refPattern = /\(([^)]+\.md)\)/g;
  const indexedFiles = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = refPattern.exec(browseContent)) !== null) {
    const indexed = normalizeMarkdownRef(match[1] ?? "", plansDir);
    if (indexed) indexedFiles.add(indexed);
  }

  const diskSet = new Set(diskFiles);

  const unindexed = diskFiles.filter((f) => !indexedFiles.has(f));
  const stale = [...indexedFiles].filter((f) => !diskSet.has(f));

  if (unindexed.length === 0 && stale.length === 0) {
    return { message: "[plans-index-drift-detect] plans/BROWSE.md in sync with filesystem." };
  }

  const lines: string[] = ["[plans-index-drift-detect] ADVISORY — plans/BROWSE.md drift detected:"];
  if (unindexed.length > 0) {
    lines.push(`  Unindexed files (${unindexed.length}): ${unindexed.join(", ")}`);
  }
  if (stale.length > 0) {
    lines.push(`  Stale BROWSE.md refs (${stale.length}): ${stale.join(", ")}`);
  }
  lines.push(`  Action: update ${path.join(plansDir, "BROWSE.md")} manually or via Lead judgment.`);

  return {
    message: lines.join("\n"),
    additionalContext: JSON.stringify({ unindexed, stale }),
  };
}

function collectMarkdownFiles(root: string, current = root): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(root, fullPath));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const relativePath = normalizeRelativePath(path.relative(root, fullPath));
    if (relativePath === "BROWSE.md") continue;
    files.push(relativePath);
  }
  return files.sort();
}

function normalizeMarkdownRef(ref: string, plansDir: string): string | null {
  const withoutAnchor = ref.split("#")[0]?.trim() ?? "";
  if (!withoutAnchor || /^https?:\/\//i.test(withoutAnchor)) return null;
  const decoded = decodeURIComponent(withoutAnchor);
  const relativePath = path.isAbsolute(decoded)
    ? path.relative(plansDir, decoded)
    : decoded.replace(/^\.\//, "");
  if (relativePath.startsWith("..")) return null;
  return normalizeRelativePath(relativePath);
}

function normalizeRelativePath(value: string): string {
  return value.split(path.sep).join("/");
}
