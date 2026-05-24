// palantir-mini v3.7.0 — scripts/gen-skill-docs/section-formatters.ts
// Template discovery + frontmatter parsing + processTemplate.
// Extracted from gen-skill-docs.ts during A.3 decomposition.

import * as fs from "fs";
import * as path from "path";
import type { TemplateContext, Host } from "../resolvers/types";
import { RESOLVERS } from "../resolvers/index";

const ROOT = path.resolve(import.meta.dir, "..", "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const GENERATED_HEADER =
  "<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n" +
  "<!-- Regenerate: bun run gen:skill-docs -->\n";

export interface TemplateInfo {
  tmplPath: string;
  mdPath: string;
  skillName: string;
}

export function findTemplates(): TemplateInfo[] {
  const out: TemplateInfo[] = [];
  if (!fs.existsSync(SKILLS_DIR)) return out;
  for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const tmplPath = path.join(SKILLS_DIR, entry.name, "SKILL.md.tmpl");
    if (!fs.existsSync(tmplPath)) continue;
    out.push({
      tmplPath,
      mdPath: path.join(SKILLS_DIR, entry.name, "SKILL.md"),
      skillName: entry.name,
    });
  }
  return out.sort((a, b) => a.skillName.localeCompare(b.skillName));
}

export function extractFrontmatterField(content: string, field: string): string | undefined {
  const fmStart = content.indexOf("---\n");
  if (fmStart !== 0) return undefined;
  const fmEnd = content.indexOf("\n---", fmStart + 4);
  if (fmEnd === -1) return undefined;
  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const m = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return m?.[1]?.trim();
}

export function extractBenefitsFrom(content: string): string[] | undefined {
  const m = content.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  const inner = m?.[1];
  if (!inner) return undefined;
  const list = inner
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

export function processTemplate(info: TemplateInfo, host: Host = "claude"): string {
  const tmpl = fs.readFileSync(info.tmplPath, "utf-8");
  const frontmatterName = extractFrontmatterField(tmpl, "name");
  const skillName = frontmatterName ?? info.skillName;
  const benefitsFrom = extractBenefitsFrom(tmpl);
  const tierRaw = extractFrontmatterField(tmpl, "preamble-tier");
  const preambleTier = tierRaw ? parseInt(tierRaw, 10) : undefined;

  const ctx: TemplateContext = {
    skillName,
    tmplPath: info.tmplPath,
    benefitsFrom,
    host,
    preambleTier,
  };

  const relTmpl = path.relative(ROOT, info.tmplPath);

  let content = tmpl.replace(/\{\{(\w+(?::[^}]+)?)\}\}/g, (_match, fullKey) => {
    const parts = (fullKey as string).split(":");
    const resolverName = parts[0] ?? "";
    const args = parts.slice(1);
    if (!resolverName) {
      throw new Error(`Empty placeholder in ${relTmpl}`);
    }
    const resolver = RESOLVERS[resolverName];
    if (!resolver) {
      throw new Error(`Unknown placeholder {{${resolverName}}} in ${relTmpl}`);
    }
    return args.length > 0 ? resolver(ctx, args) : resolver(ctx);
  });

  const remaining = content.match(/\{\{(\w+(?::[^}]+)?)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmpl}: ${remaining.join(", ")}`);
  }

  const header = GENERATED_HEADER.replace("{{SOURCE}}", path.basename(info.tmplPath));
  const fmStart = content.indexOf("---");
  if (fmStart === 0) {
    const fmEnd = content.indexOf("---", fmStart + 3);
    if (fmEnd !== -1) {
      const insertAt = content.indexOf("\n", fmEnd) + 1;
      content = content.slice(0, insertAt) + header + content.slice(insertAt);
    } else {
      content = header + content;
    }
  } else {
    content = header + content;
  }

  return content;
}

export { ROOT };
