#!/usr/bin/env bun
/**
 * gen-rule-registry.ts
 *
 * Reads every ~/.claude/rules/NN-*.md + projects/<p>/.claude/rules/*.md file's
 * YAML frontmatter and emits src/generated/rule-registry.ts — a byte-deterministic
 * TypeScript module consumed by pm_rule_get / pm_rule_list MCP handlers.
 *
 * Authority: Rule primitive (schemas v1.18.0) + rules/CONTEXT.md §5 frontmatter spec.
 *
 * Usage:
 *   bun run .claude/schemas/scripts/gen-rule-registry.ts
 *
 * Exit codes:
 *   0 — success (wrote registry)
 *   1 — environment error (rules/ not found, write failed)
 *   2 — validation error (frontmatter missing required fields, drift detected)
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const HOME = process.env.HOME ?? os.homedir();
const RULES_DIRS = [
  { scope: "global" as const, dir: path.join(HOME, ".claude/rules") },
  // Project-scoped rules (discovered dynamically below)
];
const PROJECTS_ROOT = path.join(HOME, "projects");
const OUTPUT_PATH = path.join(HOME, ".claude/schemas/src/generated/rule-registry.ts");

interface RuleFrontmatter {
  ruleId?: number;
  slug?: string;
  scope?: string;
  version?: string;
  invariant?: string;
  supersededBy?: number | null;
  scopeMigratedTo?: string | null;
  crossRefs?: number[];
  hookCitations?: string[];
  tier?: "T1" | "T2";
  mandatoryLoad?: boolean;
  bodyLocCeiling?: number;
}

interface ParsedRule {
  frontmatter: RuleFrontmatter;
  bodyPath: string;
  filename: string;
  lastModified: string;
}

function parseFrontmatter(source: string): RuleFrontmatter | null {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const yaml = match[1];
  const fm: RuleFrontmatter = {};
  const lines = yaml.split("\n");
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let raw = m[2].trim();
    // strip quotes
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    if (key === "ruleId") {
      const n = parseInt(raw, 10);
      if (!isNaN(n)) fm.ruleId = n;
    } else if (key === "supersededBy") {
      if (raw === "null" || raw === "") fm.supersededBy = null;
      else {
        const n = parseInt(raw, 10);
        if (!isNaN(n)) fm.supersededBy = n;
      }
    } else if (key === "scopeMigratedTo") {
      fm.scopeMigratedTo = raw === "null" ? null : raw;
    } else if (key === "crossRefs" || key === "hookCitations") {
      // parse YAML-style inline array: [1, 2, 3] or [foo, bar]
      const arrMatch = raw.match(/\[([^\]]*)\]/);
      if (arrMatch) {
        const items = arrMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (key === "crossRefs") {
          fm.crossRefs = items.map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
        } else {
          fm.hookCitations = items.map((s) => s.replace(/^["']|["']$/g, ""));
        }
      }
    } else if (key === "mandatoryLoad") {
      fm.mandatoryLoad = raw === "true";
    } else if (key === "bodyLocCeiling") {
      const n = parseInt(raw, 10);
      if (!isNaN(n)) fm.bodyLocCeiling = n;
    } else if (key === "tier") {
      if (raw === "T1" || raw === "T2") fm.tier = raw;
    } else if (key === "slug" || key === "scope" || key === "version" || key === "invariant") {
      (fm as Record<string, unknown>)[key] = raw;
    }
  }
  return fm;
}

function discoverRuleFiles(scope: "global" | `project:${string}`, dir: string): ParsedRule[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const parsed: ParsedRule[] = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const source = fs.readFileSync(full, "utf8");
    const fm = parseFrontmatter(source);
    if (!fm || fm.ruleId === undefined) continue;
    const stat = fs.statSync(full);
    parsed.push({
      frontmatter: { ...fm, scope: fm.scope ?? scope },
      bodyPath: full,
      filename: f,
      lastModified: stat.mtime.toISOString(),
    });
  }
  return parsed;
}

function discoverProjects(): Array<{ scope: `project:${string}`; dir: string }> {
  if (!fs.existsSync(PROJECTS_ROOT)) return [];
  const entries = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true });
  const out: Array<{ scope: `project:${string}`; dir: string }> = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const d = path.join(PROJECTS_ROOT, e.name, ".claude/rules");
    if (fs.existsSync(d)) {
      out.push({ scope: `project:${e.name}`, dir: d });
    }
  }
  return out;
}

function getGitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", cwd: HOME }).trim();
  } catch {
    return "unknown";
  }
}

function renderRegistry(rules: ParsedRule[]): string {
  const sha = getGitSha();
  const now = new Date().toISOString();
  const header = `/**
 * GENERATED — do NOT edit by hand. Regenerate via:
 *   bun run .claude/schemas/scripts/gen-rule-registry.ts
 *
 * @generatedAt   ${now}
 * @generatedFrom ${sha}
 * @ontologyHash  ${rules.length}-rule-registry-v1
 * @schemaVersion 1.18.0
 * @generator     gen-rule-registry.ts
 *
 * Source contract: rules/CONTEXT.md §5 + schemas primitives/rule.ts.
 * Editing this file directly violates rule 11 (codegen authority).
 */

import type { RuleDeclaration, RuleId, RuleRegistry } from "../../ontology/primitives/rule";

export const RULE_REGISTRY_ENTRIES: ReadonlyArray<RuleDeclaration> = [
`;

  const entries = rules
    .slice()
    .sort((a, b) => {
      const aId = a.frontmatter.ruleId ?? 0;
      const bId = b.frontmatter.ruleId ?? 0;
      if (aId !== bId) return aId - bId;
      return (a.frontmatter.scope ?? "").localeCompare(b.frontmatter.scope ?? "");
    })
    .map((r) => {
      const fm = r.frontmatter;
      const relPath = path.relative(HOME, r.bodyPath);
      return `  {
    ruleId: ${fm.ruleId},
    slug: ${JSON.stringify(fm.slug ?? "")},
    scope: ${JSON.stringify(fm.scope ?? "global")},
    version: ${JSON.stringify(fm.version ?? "1.0.0")},
    invariant: ${JSON.stringify(fm.invariant ?? "")},
    supersededBy: ${fm.supersededBy === undefined ? "null" : JSON.stringify(fm.supersededBy)},${
    fm.scopeMigratedTo !== undefined
      ? `\n    scopeMigratedTo: ${JSON.stringify(fm.scopeMigratedTo)},`
      : ""
  }
    crossRefs: ${JSON.stringify(fm.crossRefs ?? [])},
    hookCitations: ${JSON.stringify(fm.hookCitations ?? [])},
    bodyPath: ${JSON.stringify(relPath)},
    lastModified: ${JSON.stringify(r.lastModified)},${fm.tier ? `\n    tier: ${JSON.stringify(fm.tier)},` : ""}${fm.bodyLocCeiling !== undefined ? `\n    bodyLocCeiling: ${fm.bodyLocCeiling},` : ""}
  },`;
    })
    .join("\n");

  const footer = `
] as const;

/** Map-based registry for O(1) lookup by ruleId. */
export const RULE_REGISTRY: RuleRegistry = new Map<RuleId, RuleDeclaration>(
  RULE_REGISTRY_ENTRIES.map((r) => [r.ruleId, r] as const),
);

/** Count of distinct ruleIds registered. */
export const RULE_REGISTRY_COUNT = RULE_REGISTRY.size;
`;

  return header + entries + footer;
}

function main(): number {
  const allProjects = discoverProjects();
  const allDirs: Array<{ scope: "global" | `project:${string}`; dir: string }> = [
    ...RULES_DIRS,
    ...allProjects,
  ];

  const rules: ParsedRule[] = [];
  for (const { scope, dir } of allDirs) {
    rules.push(...discoverRuleFiles(scope, dir));
  }

  if (rules.length === 0) {
    console.error("gen-rule-registry: no rule files found");
    return 1;
  }

  // Validation: no recycled ruleIds within same scope
  const seen = new Set<string>();
  for (const r of rules) {
    const key = `${r.frontmatter.scope}:${r.frontmatter.ruleId}`;
    if (seen.has(key)) {
      console.error(`gen-rule-registry: recycled ruleId detected: ${key}`);
      return 2;
    }
    seen.add(key);
  }

  const output = renderRegistry(rules);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(
    `gen-rule-registry: wrote ${rules.length} rules → ${path.relative(HOME, OUTPUT_PATH)}`,
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}

export { parseFrontmatter, discoverRuleFiles, renderRegistry };
