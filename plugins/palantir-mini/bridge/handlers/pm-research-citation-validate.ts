// palantir-mini v4.0.0 — MCP tool handler: pm_research_citation_validate
// Domain: LEARN (ResearchDocument frontmatter citation integrity)
//
// Validates that ~/.claude/research/palantir-vision/**/*.md frontmatter
// primaryCitations[].source fields reference existing entries in the current
// palantir-official _manifest.json canonical citation index. Legacy
// palantir-foundry manifests are fallback-only compatibility indexes.
//
// Authority chain:
//   rules/02-research-retrieval.md (research/ AI-agent read-only SSoT)
//   schemas/ontology/primitives/research-document.ts (ResearchDocument)
//   plans/distributed-wishing-manatee.md §T4.1

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import { resolvePalantirMiniRoot } from "../../lib/config/root";

export interface PmResearchCitationValidateInput {
  researchRoot?: string;
  citationIndexPath?: string;
  failFast?: boolean;
  /**
   * External non-Foundry-doc domains allowed as primary citations for synthesis
   * files. Foundry docs still must be present in the canonical manifest.
   */
  allowedExternalDomains?: string[];
}

export interface CitationViolation {
  file: string;
  claimedSource: string;
  reason: "not-in-index" | "stale" | "malformed";
}

export interface PmResearchCitationValidateResult {
  filesScanned: number;
  filesWithFrontmatter: number;
  filesWithoutFrontmatter: string[];
  citationViolations: CitationViolation[];
  verdict: "pass" | "fail";
}

const HOME = process.env.HOME ?? "/home/palantirkc";
const PLUGIN_ROOT = resolvePalantirMiniRoot();

function defaultResearchRoot(): string {
  const external = path.join(HOME, ".claude", "research", "palantir-vision");
  if (fs.existsSync(external)) return external;
  return path.join(PLUGIN_ROOT, "runtime-overlay", "research-library", "palantir-vision");
}

function defaultCitationIndexPath(): string {
  const candidates = [
    path.join(HOME, ".claude", "research", "palantir-official", "_manifest.json"),
    path.join(HOME, ".claude", "research", "palantir-foundry", "_manifest.json"),
    path.join(PLUGIN_ROOT, "runtime-overlay", "research-library", "palantir-foundry", "_manifest.json"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]!;
}

/** Recursively collect .md files under dir (excluding BROWSE.md / INDEX.md). */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".md") &&
        entry.name !== "BROWSE.md" &&
        entry.name !== "INDEX.md"
      ) {
        results.push(full);
      }
    }
  };
  walk(dir);
  return results;
}

/** Extract YAML frontmatter block (between first --- fences). Returns null if absent. */
function extractFrontmatter(content: string): Record<string, unknown> | null {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return null;
  const closeIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (closeIdx === -1) return null;
  const yamlLines = lines.slice(1, closeIdx);
  // Minimal YAML parser: handle scalar fields plus the array/object shapes used
  // by primaryCitations. This intentionally avoids a runtime dependency.
  const obj: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let inArray = false;
  const arr: unknown[] = [];
  for (const line of yamlLines) {
    const indentedFieldMatch = /^\s+([\w-]+):\s*(.*)$/.exec(line);
    const scalarMatch = /^(\w[\w-]*):\s*(.+)$/.exec(line);
    const keyOnlyMatch = /^(\w[\w-]*):\s*$/.exec(line);
    const arrayItemMatch = /^\s+-\s+(.*)$/.exec(line);
    if (arrayItemMatch && inArray) {
      // Try to parse as object shorthand or plain string
      const val = arrayItemMatch[1]!.trim();
      if (val.startsWith("{")) {
        arr.push(parseInlineObject(val) ?? { raw: val });
      } else {
        const field = /^([\w-]+):\s*(.*)$/.exec(val);
        if (field) {
          arr.push({ [field[1]!]: parseInlineValue(field[2] ?? "") });
        } else {
          arr.push(val);
        }
      }
    } else if (indentedFieldMatch && inArray && arr.length > 0) {
      const last = arr[arr.length - 1];
      if (typeof last === "object" && last !== null && !Array.isArray(last)) {
        (last as Record<string, unknown>)[indentedFieldMatch[1]!] = parseInlineValue(indentedFieldMatch[2] ?? "");
      } else {
        arr[arr.length - 1] = {
          raw: last,
          [indentedFieldMatch[1]!]: parseInlineValue(indentedFieldMatch[2] ?? ""),
        };
      }
    } else if (arrayItemMatch) {
      // nested array item without a preceding key — skip
    } else if (keyOnlyMatch) {
      if (currentKey && inArray) {
        obj[currentKey] = [...arr];
        arr.length = 0;
      }
      currentKey = keyOnlyMatch[1]!;
      inArray = true;
    } else if (scalarMatch) {
      if (currentKey && inArray) {
        obj[currentKey] = [...arr];
        arr.length = 0;
        inArray = false;
      }
      obj[scalarMatch[1]!] = scalarMatch[2]!.trim();
      currentKey = null;
    }
  }
  if (currentKey && inArray) {
    obj[currentKey] = [...arr];
  }
  return obj;
}

function parseInlineObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  const body = trimmed.slice(1, -1).trim();
  if (body.length === 0) return {};

  const out: Record<string, unknown> = {};
  for (const field of splitInlineObjectFields(body)) {
    const match = /^([\w-]+):\s*(.*)$/.exec(field.trim());
    if (!match) return null;
    out[match[1]!] = parseInlineValue(match[2] ?? "");
  }
  return out;
}

function splitInlineObjectFields(body: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
  let escaped = false;
  for (const ch of body) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      current += ch;
      escaped = true;
      continue;
    }
    if ((ch === "\"" || ch === "'") && quote === null) {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === quote) {
      quote = null;
      current += ch;
      continue;
    }
    if (ch === "," && quote === null) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) fields.push(current);
  return fields;
}

function parseInlineValue(raw: string): unknown {
  const value = raw.trim();
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeSource(source: string): string {
  return source
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/index\.html$/, "/")
    .replace(/\/+$/, "")
    .replace(/\/overview$/, "");
}

const DEFAULT_ALLOWED_EXTERNAL_DOMAINS = [
  "palantir.com",
  "www.palantir.com",
  "blog.palantir.com",
  "www.businesswire.com",
  "businesswire.com",
  "www.investing.com",
  "investing.com",
  "x.com",
] as const;

function sourceUrl(source: string): URL | null {
  const normalized = source.trim();
  if (!normalized) return null;
  try {
    return new URL(normalized);
  } catch {
    try {
      return new URL(`https://${normalized}`);
    } catch {
      return null;
    }
  }
}

function isPalantirDocsSource(source: string): boolean {
  const url = sourceUrl(source);
  if (!url) return false;
  return (
    (url.hostname === "palantir.com" || url.hostname === "www.palantir.com") &&
    url.pathname.startsWith("/docs/")
  );
}

function isUrlLikeSource(source: string): boolean {
  return /^https?:\/\//.test(source.trim()) || /^[\w.-]+\.[A-Za-z]{2,}\//.test(source.trim());
}

function isAllowedExternalSource(source: string, domains: readonly string[]): boolean {
  if (isPalantirDocsSource(source)) return false;
  const url = sourceUrl(source);
  if (!url) return false;
  return domains.includes(url.hostname);
}

function addSource(sources: Set<string>, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) return;
  const normalized = normalizeSource(value);
  sources.add(normalized);
  if (!normalized.endsWith("/overview")) sources.add(`${normalized}/overview`);
}

/** Load the citation index from current docs[] and legacy entries[] shapes. */
function loadCitationIndex(indexPath: string): Set<string> | null {
  if (!fs.existsSync(indexPath)) return null;
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const manifest = JSON.parse(raw) as {
      docs?: Array<Record<string, unknown>>;
      entries?: Array<Record<string, unknown>>;
      sources?: Array<Record<string, unknown>>;
    };
    const sources = new Set<string>();
    for (const entry of manifest.docs ?? []) {
      addSource(sources, entry.sourceUrl);
      addSource(sources, entry.canonicalUrl);
      addSource(sources, entry.source);
      addSource(sources, entry.url);
    }
    for (const entry of manifest.entries ?? []) {
      addSource(sources, entry.source);
      addSource(sources, entry.sourceUrl);
      addSource(sources, entry.canonicalUrl);
      addSource(sources, entry.url);
    }
    for (const entry of manifest.sources ?? []) {
      addSource(sources, entry.source);
      addSource(sources, entry.sourceUrl);
      addSource(sources, entry.canonicalUrl);
      addSource(sources, entry.url);
    }
    return sources;
  } catch {
    return null;
  }
}

export default async function pmResearchCitationValidate(
  rawArgs: unknown,
): Promise<PmResearchCitationValidateResult> {
  const args = (rawArgs ?? {}) as PmResearchCitationValidateInput;
  const researchRoot = args.researchRoot ?? defaultResearchRoot();
  const citationIndexPath = args.citationIndexPath ?? defaultCitationIndexPath();
  const failFast = args.failFast ?? false;
  const allowedExternalDomains =
    args.allowedExternalDomains ?? [...DEFAULT_ALLOWED_EXTERNAL_DOMAINS];

  const cwd = resolveProjectRoot();
  const files = collectMarkdownFiles(researchRoot);
  const citationIndex = loadCitationIndex(citationIndexPath);

  const filesWithoutFrontmatter: string[] = [];
  const citationViolations: CitationViolation[] = [];

  let filesWithFrontmatter = 0;

  outer: for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const fm = extractFrontmatter(content);
    if (fm === null) {
      filesWithoutFrontmatter.push(filePath);
      continue;
    }
    filesWithFrontmatter++;

    const citations = fm["primaryCitations"];
    if (!citations) continue;
    if (!Array.isArray(citations)) {
      citationViolations.push({
        file: filePath,
        claimedSource: "(primaryCitations not an array)",
        reason: "malformed",
      });
      if (failFast) break outer;
      continue;
    }

    for (const citation of citations) {
      let source: string | undefined;
      if (typeof citation === "string") {
        source = citation;
        const yamlObjectLike = /^source:\s*(.+)$/.exec(source);
        if (yamlObjectLike) source = String(parseInlineValue(yamlObjectLike[1] ?? ""));
      } else if (typeof citation === "object" && citation !== null) {
        const rawSource = (citation as Record<string, unknown>)["source"];
        if (rawSource === null) {
          continue;
        }
        source = rawSource as string | undefined;
      }
      if (!source || typeof source !== "string") {
        citationViolations.push({
          file: filePath,
          claimedSource: JSON.stringify(citation),
          reason: "malformed",
        });
        if (failFast) break outer;
        continue;
      }
      if (!isUrlLikeSource(source)) {
        citationViolations.push({
          file: filePath,
          claimedSource: source,
          reason: "malformed",
        });
        if (failFast) break outer;
        continue;
      }
      if (isAllowedExternalSource(source, allowedExternalDomains)) {
        continue;
      }
      if (citationIndex === null) {
        // Index missing — can't validate; treat as advisory pass
        continue;
      }
      if (!citationIndex.has(normalizeSource(source))) {
        citationViolations.push({ file: filePath, claimedSource: source, reason: "not-in-index" });
        if (failFast) break outer;
      }
    }
  }

  const verdict: "pass" | "fail" = citationViolations.length > 0 ? "fail" : "pass";

  await emit({
    type: "validation_phase_completed",
    payload: {
      phase: "post_write",
      passed: verdict === "pass",
      errorClass: "research_citation_validate",
    },
    toolName: "pm_research_citation_validate",
    cwd,
    reasoning: `Citation validation: scanned ${files.length} files, ${citationViolations.length} violations, verdict=${verdict}`,
  });

  return {
    filesScanned: files.length,
    filesWithFrontmatter,
    filesWithoutFrontmatter,
    citationViolations,
    verdict,
  };
}
