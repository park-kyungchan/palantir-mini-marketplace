// palantir-mini v3.4.0 — pm-rule-audit sibling: types + shared constants/helpers
// Per rules/CONTEXT.md §12 ceilings.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";
import { resolvePalantirMiniRoot } from "../../../lib/config/root";

export const HOME = process.env.HOME ?? os.homedir();
export const RULES_DIR = path.join(HOME, ".claude/rules");
export const MEMORY_MD = path.join(
  HOME,
  ".claude/projects/-home-palantirkc/memory/MEMORY.md",
);
export const HOOKS_DIR = path.join(resolvePalantirMiniRoot(), "hooks");

export const CEILINGS = {
  t1CoreHard: 25,
  t1ContextHard: 400,
  t1BrowseHard: 30,
  t1TotalHard: 445,
  t2PerRuleHard: 30, // body-only, frontmatter stripped
  t2TotalHard: 600,
};

export interface Args {
  includeAdvisory?: boolean;
  /** sprint-055 W3.A — project root for events.jsonl mention scan (unused_rule_30d) */
  projectRoot?: string;
}

export interface RuleAuditResult {
  findings: RuleAuditFinding[];
  summary: {
    totalFindings: number;
    byKind: Record<string, number>;
    bySeverity: Record<string, number>;
    /** Backward-compatible alias; prefer registeredTotal for new callers. */
    registeredRules: number;
    registeredTotal: number;
    activeGlobalCount: number;
  };
}

export function countLines(filepath: string): number {
  if (!fs.existsSync(filepath)) return 0;
  const content = fs.readFileSync(filepath, "utf8");
  if (content.length === 0) return 0;
  // Strip a single trailing newline so files with/without trailing newline
  // count identically (POSIX-compliant text file convention).
  // wc -l counts newlines; this matches that semantic. Pre-fix this function
  // returned wc-l + 1 for files ending in "\n" (CORE.md 25-line file showed 26).
  const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
  return trimmed.split("\n").length;
}

/**
 * Body-only LOC for T2 rule files: strips YAML frontmatter block (between
 * opening and closing `---` markers, inclusive) plus leading/trailing blanks.
 */
export function countBodyLines(filepath: string): number {
  if (!fs.existsSync(filepath)) return 0;
  const content = fs.readFileSync(filepath, "utf8");
  const match = content.match(/^---\n[\s\S]*?\n---\n/);
  const body = match ? content.slice(match[0].length) : content;
  const trimmed = body.replace(/^\s*\n/, "").replace(/\n\s*$/, "");
  if (trimmed.length === 0) return 0;
  return trimmed.split("\n").length;
}
