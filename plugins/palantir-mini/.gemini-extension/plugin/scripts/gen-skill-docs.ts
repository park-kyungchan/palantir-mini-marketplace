#!/usr/bin/env bun
/**
 * palantir-mini v3.7.0 — gen-skill-docs (orchestrator)
 *
 * Pipeline:
 *   discover skills/<name>/SKILL.md.tmpl
 *   → find {{PLACEHOLDERS}}
 *   → resolve via RESOLVERS
 *   → prepend generated header after frontmatter
 *   → write skills/<name>/SKILL.md
 *
 * Decomposed in v3.7.0 A.3: section-formatters extracted to ./gen-skill-docs/*.
 *
 * Flags:
 *   --dry-run   generate in memory; exit 1 if any output differs from committed .md
 */

import * as fs from "fs";
import * as path from "path";
import {
  findTemplates,
  processTemplate,
  ROOT,
} from "./gen-skill-docs/section-formatters";

// Backward-compat re-exports
export {
  findTemplates,
  extractFrontmatterField,
  extractBenefitsFrom,
  processTemplate,
} from "./gen-skill-docs/section-formatters";
export type { TemplateInfo } from "./gen-skill-docs/section-formatters";

const DRY_RUN = process.argv.includes("--dry-run");

function main(): void {
  const templates = findTemplates();
  if (templates.length === 0) {
    console.log("No SKILL.md.tmpl files found under skills/");
    return;
  }

  let staleCount = 0;
  const budget: Array<{ skill: string; lines: number; tokens: number }> = [];

  for (const info of templates) {
    const relMd = path.relative(ROOT, info.mdPath);
    let generated: string;
    try {
      generated = processTemplate(info);
    } catch (e) {
      console.error(`FAIL ${relMd}: ${(e as Error).message}`);
      process.exit(1);
    }

    if (DRY_RUN) {
      const committed = fs.existsSync(info.mdPath)
        ? fs.readFileSync(info.mdPath, "utf-8")
        : "";
      if (committed !== generated) {
        console.log(`STALE ${relMd}`);
        staleCount++;
      } else {
        console.log(`FRESH ${relMd}`);
      }
    } else {
      fs.writeFileSync(info.mdPath, generated);
      console.log(`WROTE ${relMd}`);
    }

    budget.push({
      skill: info.skillName,
      lines: generated.split("\n").length,
      tokens: Math.round(generated.length / 4),
    });

    if (generated.length > 100_000) {
      console.warn(
        `WARN ${relMd}: ${generated.length} bytes (~${Math.round(generated.length / 4)} tokens) exceeds 100KB ceiling`,
      );
    }
  }

  if (DRY_RUN) {
    if (staleCount > 0) {
      console.error(
        `\n${staleCount} SKILL.md file(s) stale. Run: bun run gen:skill-docs`,
      );
      process.exit(1);
    }
  } else if (budget.length > 0) {
    console.log("");
    console.log("Token Budget (Claude)");
    console.log("-".repeat(60));
    budget.sort((a, b) => b.lines - a.lines);
    for (const b of budget) {
      console.log(
        `  ${b.skill.padEnd(30)} ${String(b.lines).padStart(5)} lines  ~${String(b.tokens).padStart(6)} tokens`,
      );
    }
    const totalLines = budget.reduce((s, b) => s + b.lines, 0);
    const totalTokens = budget.reduce((s, b) => s + b.tokens, 0);
    console.log("-".repeat(60));
    console.log(
      `  ${"TOTAL".padEnd(30)} ${String(totalLines).padStart(5)} lines  ~${String(totalTokens).padStart(6)} tokens`,
    );
  }
}

if (import.meta.main) {
  main();
}
