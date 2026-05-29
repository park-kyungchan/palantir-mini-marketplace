// palantir-mini — plans-index-drift-detect hook (stub)
// Fires on: SessionStart (advisory, async)
//
// Per rule 02 v3.2.0 §Plans index drift detection (R6-F18):
// Compares <project>/.palantir-mini/plan/*.md filesystem listing against
// <project>/.palantir-mini/plan/BROWSE.md. Surfaces unindexed / stale-ref
// deltas as advisory. Legacy ~/.claude/plans/ remains readable provenance, but
// new durable palantir-mini synthesis belongs in the plugin-layer plan root.
//
// Authority: rule 02 (research-retrieval) v3.2.0 §Plans index drift detection
//
// STUB: full implementation by hook-builder agent. This stub satisfies:
//   - hookCitations entry in rule 02 frontmatter (rule 22 citation-validate)
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

  // Collect .md files on disk (exclude BROWSE.md itself).
  const diskFiles = fs
    .readdirSync(plansDir)
    .filter((f) => f.endsWith(".md") && f !== "BROWSE.md")
    .map((f) => f);

  // Extract filenames referenced in BROWSE.md (markdown link pattern [text](file.md)).
  const refPattern = /\(([^)]+\.md)\)/g;
  const indexedFiles = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = refPattern.exec(browseContent)) !== null) {
    indexedFiles.add(path.basename(match[1] ?? ""));
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
