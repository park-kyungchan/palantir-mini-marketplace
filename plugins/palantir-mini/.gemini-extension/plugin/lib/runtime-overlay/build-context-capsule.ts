// palantir-mini v4.13.0 — lib/runtime-overlay/build-context-capsule.ts (sprint-061 A.W2.a)
//
// Builds a ≤500-token compact context capsule from the plugin-resident rule
// overlay.  Used by session-start-overlay-injector as `additionalContext`.
//
// Capsule contents (in order):
//   1. CORE.md  (~25 LOC) — invariant snapshot from plugin overlay
//   2. BROWSE.md (~20 LOC) — query-router from plugin overlay
//   3. First non-empty paragraph of CONTEXT.md §1 Purpose (≤8 lines)
//   4. "rules count: N active" — derived from overlay rules/ file count
//   5. pm_rule_query usage hint — single line
//
// Token budget: CORE ~150 tok + BROWSE ~100 tok + §1 ~80 tok + 2 lines ~15 tok
// = ~345 tok (well within ≤500 token target).
//
// Authority: sprint-061 A.W2.a plan §4.A.W2.
// Plan: ~/.claude/plans/inherited-discovering-quill.md §4.A.W2.

import * as fs from "fs";
import * as path from "path";
import { OVERLAY_RULES_DIR } from "./resolve-rule";

/** Max lines from CORE.md (should be ~25). */
const CORE_MAX_LINES = 30;

/** Max lines from BROWSE.md (should be ~20). */
const BROWSE_MAX_LINES = 25;

/** Max lines to scan in CONTEXT.md when looking for §1 Purpose paragraph. */
const CONTEXT_SCAN_LINES = 80;

/** Max lines to capture for the §1 Purpose paragraph. */
const CONTEXT_PARA_MAX_LINES = 8;

function readLines(filePath: string, maxLines: number): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split("\n");
    const sliced = lines.slice(0, maxLines);
    if (lines.length > maxLines) sliced.push(`… (truncated after ${maxLines} lines)`);
    return sliced.join("\n");
  } catch {
    return null;
  }
}

/**
 * Extract the first paragraph-like block after the `## §1 — Purpose` heading
 * in CONTEXT.md.  Returns ≤CONTEXT_PARA_MAX_LINES lines of that paragraph, or
 * null if the heading is not found within CONTEXT_SCAN_LINES.
 */
function extractContextPurposeParagraph(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split("\n").slice(0, CONTEXT_SCAN_LINES);
    let inSection = false;
    const para: string[] = [];
    for (const line of lines) {
      if (/^##\s+§1/.test(line)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        // Stop at the next ##-level heading.
        if (/^##/.test(line)) break;
        // Stop at a blank line after we have ≥2 content lines (paragraph end).
        if (line.trim() === "" && para.length >= 2) break;
        // Accumulate non-blank lines (skip leading blank).
        if (line.trim() !== "" || para.length > 0) {
          para.push(line);
        }
        if (para.length >= CONTEXT_PARA_MAX_LINES) break;
      }
    }
    return para.length > 0 ? para.join("\n") : null;
  } catch {
    return null;
  }
}

/** Count NN-*.md files in the overlay rules dir (active rules only, not meta). */
function countOverlayRules(rulesDir: string): number {
  if (!fs.existsSync(rulesDir)) return 0;
  try {
    return fs.readdirSync(rulesDir).filter(
      (f) => /^\d{2}-/.test(f) && f.endsWith(".md"),
    ).length;
  } catch {
    return 0;
  }
}

/**
 * Build the ≤500-token context capsule from the plugin overlay.
 * Never throws — returns a minimal fallback string on error.
 */
export async function buildContextCapsule(): Promise<string> {
  try {
    const corePath    = path.join(OVERLAY_RULES_DIR, "CORE.md");
    const browsePath  = path.join(OVERLAY_RULES_DIR, "BROWSE.md");
    const contextPath = path.join(OVERLAY_RULES_DIR, "CONTEXT.md");

    const coreContent   = readLines(corePath,   CORE_MAX_LINES);
    const browseContent = readLines(browsePath,  BROWSE_MAX_LINES);
    const purposePara   = extractContextPurposeParagraph(contextPath);
    const rulesCount    = countOverlayRules(OVERLAY_RULES_DIR);

    const sections: string[] = ["## palantir-mini rules overlay capsule\n"];

    if (coreContent !== null) {
      sections.push(`### CORE.md (invariants)\n\`\`\`\n${coreContent}\n\`\`\`\n`);
    } else {
      sections.push("### CORE.md — _(not found in plugin overlay)_\n");
    }

    if (browseContent !== null) {
      sections.push(`### BROWSE.md (query router)\n\`\`\`\n${browseContent}\n\`\`\`\n`);
    } else {
      sections.push("### BROWSE.md — _(not found in plugin overlay)_\n");
    }

    if (purposePara !== null) {
      sections.push(
        `### CONTEXT.md §1 Purpose (excerpt)\n${purposePara}\n`,
      );
    }

    sections.push(
      `**rules count:** ${rulesCount > 0 ? rulesCount : "unknown"} active rules in plugin overlay.\n`,
    );
    sections.push(
      "**pm_rule_query:** use `mcp__plugin_palantir-mini_palantir-mini__pm_rule_query` with `{ byId: N }` for full rule body.\n",
    );

    return sections.join("\n");
  } catch (e) {
    return `## palantir-mini rules overlay capsule\n_(error building capsule: ${(e as Error).message ?? String(e)})_\n`;
  }
}
