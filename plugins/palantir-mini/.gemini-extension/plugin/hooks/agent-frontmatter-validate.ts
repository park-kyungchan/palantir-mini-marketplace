// palantir-mini v1.1 NEW — agent-frontmatter-validate hook handler
// Fires on: SessionStart (Blocking)
//
// Phase A-2 W2-2 defect #6 remediation.
//
// Scans:
//   - <project>/.claude/agents/*.md
//   - ~/.claude/agents/*.md
//
// Required frontmatter: name, description, tools, model
// Forbidden: initialPrompt (bypasses Lead briefing — see rule 12 §Agent frontmatter)
// Recommended (warn-only): maxTurns, memory
//
// Exit 2 (via decision: "block") when any non-conformant file is found.
// Exit 0 with additionalContext summarizing scanned files on success.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  session_id?: string;
  cwd?:        string;
}

export interface ValidationReport {
  file:               string;
  missingRequired:    string[];
  forbiddenPresent:   string[];
  missingRecommended: string[];
}

const REQUIRED_FIELDS    = ["name", "description", "tools", "model"] as const;
const FORBIDDEN_FIELDS   = ["initialPrompt"] as const;
const RECOMMENDED_FIELDS = ["maxTurns", "memory"] as const;

// Conventional documentation filenames that sit alongside agent definitions.
// CLAUDE.md path discipline + rules/02 establish BROWSE/INDEX as per-directory
// query router + structure index. These files must be skipped by frontmatter
// validation — they are docs, not agent declarations. Matched case-insensitively
// on basename.
const NON_AGENT_DOC_FILES = new Set<string>([
  "browse.md",
  "index.md",
  "readme.md",
  "changelog.md",
  "claude.md",
  "memory.md",
  "notes.md",
]);

export function isNonAgentDocFile(filename: string): boolean {
  return NON_AGENT_DOC_FILES.has(filename.toLowerCase());
}

/** Extracts YAML frontmatter from a markdown file; returns null if no `---` block at the top. */
export function extractFrontmatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Detects which fields are declared in a YAML frontmatter block.
 * Top-level keys only; supports both `key: value` and `key:` (multi-line list).
 * This is a targeted parser — we care about presence, not value shape.
 */
export function detectDeclaredFields(frontmatter: string): Set<string> {
  const declared = new Set<string>();
  const lines = frontmatter.split("\n");
  for (const line of lines) {
    // Match top-level keys only (no leading whitespace)
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_\-]*)\s*:/);
    if (m) {
      declared.add(m[1]!);
    }
  }
  return declared;
}

/**
 * Validates a single agent `.md` file.
 */
export function validateAgentFile(filePath: string): ValidationReport {
  const report: ValidationReport = {
    file:               filePath,
    missingRequired:    [],
    forbiddenPresent:   [],
    missingRecommended: [],
  };
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    report.missingRequired = [...REQUIRED_FIELDS];
    return report;
  }
  const fm = extractFrontmatter(content);
  if (!fm) {
    report.missingRequired = [...REQUIRED_FIELDS];
    return report;
  }
  const declared = detectDeclaredFields(fm);

  for (const f of REQUIRED_FIELDS) {
    if (!declared.has(f)) report.missingRequired.push(f);
  }
  for (const f of FORBIDDEN_FIELDS) {
    if (declared.has(f)) report.forbiddenPresent.push(f);
  }
  for (const f of RECOMMENDED_FIELDS) {
    if (!declared.has(f)) report.missingRecommended.push(f);
  }
  return report;
}

/**
 * Lists all *.md files in a directory (non-recursive).
 */
export function listAgentMdFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .filter((f) => !isNonAgentDocFile(f))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

export default async function agentFrontmatterValidate(payload: unknown): Promise<{
  message: string;
  decision?: "block" | "continue";
  reason?:   string;
  additionalContext?: string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const projectAgentsDir = path.join(cwd, ".claude", "agents");
  const userAgentsDir    = path.join(process.env.HOME ?? "/home/palantirkc", ".claude", "agents");

  const files = [
    ...listAgentMdFiles(projectAgentsDir),
    ...listAgentMdFiles(userAgentsDir),
  ];

  const reports = files.map((f) => validateAgentFile(f));
  const nonConformant = reports.filter((r) => r.missingRequired.length > 0 || r.forbiddenPresent.length > 0);
  const warnOnly       = reports.filter((r) => r.missingRequired.length === 0 && r.forbiddenPresent.length === 0 && r.missingRecommended.length > 0);

  try {
    await emit({
      type: "agent_frontmatter_validated",
      payload: {
        scanned:       reports.length,
        conformant:    reports.length - nonConformant.length,
        nonconformant: nonConformant.length,
        warnings:      warnOnly.length,
      },
      toolName:  "SessionStart",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
    });
  } catch { /* best-effort */ }

  if (nonConformant.length > 0) {
    const blockLines: string[] = [];
    for (const r of nonConformant) {
      const parts: string[] = [];
      if (r.missingRequired.length > 0)  parts.push(`missing required: ${r.missingRequired.join(", ")}`);
      if (r.forbiddenPresent.length > 0) parts.push(`forbidden field(s) present: ${r.forbiddenPresent.join(", ")}`);
      blockLines.push(`  - ${r.file}: ${parts.join("; ")}`);
    }
    const base = `palantir-mini agent-frontmatter-validate: ${nonConformant.length} non-conformant agent .md file(s):\n${blockLines.join("\n")}\nFix per rule 12 §Agent frontmatter standard.`;
    const { withRuleExcerpt } = await import("../scripts/rule-excerpt");
    const reason = await withRuleExcerpt(base, 12);
    process.stderr.write(`[palantir-mini/agent-frontmatter-validate] ${reason}\n`);
    return {
      message: `palantir-mini: agent_frontmatter_validated (nonconformant=${nonConformant.length}, scanned=${reports.length})`,
      decision: "block",
      reason,
    };
  }

  const warnLines = warnOnly.map((r) => `${path.basename(r.file)}: missing recommended ${r.missingRecommended.join(", ")}`);
  const contextParts: string[] = [];
  contextParts.push(`agent-frontmatter-validate: ${reports.length} agent file(s) scanned, all required fields present.`);
  if (warnLines.length > 0) {
    contextParts.push(`Warnings (recommended fields missing): ${warnLines.slice(0, 5).join("; ")}${warnLines.length > 5 ? ` (+${warnLines.length - 5} more)` : ""}`);
  }

  return {
    message: `palantir-mini: agent_frontmatter_validated (conformant=${reports.length - nonConformant.length}, warnings=${warnOnly.length})`,
    decision: "continue",
    additionalContext: contextParts.join(" "),
  };
}
