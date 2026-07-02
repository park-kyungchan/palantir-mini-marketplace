#!/usr/bin/env bun
// Compare generated palantir-official docs with legacy palantir-foundry mirrors.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface OfficialRow {
  sourceUrl: string;
  canonicalUrl?: string;
  sourceLastmod?: string | null;
  path: string | null;
  status: string;
  title?: string | null;
  product?: string;
  docsArea?: string;
  contentHash?: string | null;
}

interface LegacyRow {
  source?: string;
  sourceUrl?: string;
  path?: string;
  fetched?: string;
  doc_title?: string;
  title?: string;
}

interface MatchRow {
  legacyPath: string | null;
  legacySource: string | null;
  officialPath: string | null;
  officialSource: string | null;
  tokenContainment: number;
  jaccard: number;
  verdict: "exact-url" | "near-content" | "legacy-only" | "official-only";
}

const HOME = process.env.HOME ?? os.homedir();
const OFFICIAL_ROOT = path.join(HOME, ".claude", "research", "palantir-official");
const LEGACY_ROOT = path.join(HOME, ".claude", "research", "palantir-foundry");
const PLAN_ROOT = path.join(HOME, ".claude", "plans");

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    url.protocol = "https:";
    url.hostname = url.hostname.replace(/^www\./, "");
    url.hash = "";
    url.search = "";
    let pathname = url.pathname.replace(/\/+$/, "");
    pathname = pathname.replace(/\/overview$/, "");
    return `${url.hostname}${pathname}`;
  } catch {
    return value
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "")
      .replace(/\/overview$/, "");
  }
}

function bodyText(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.startsWith("---")) {
    const close = raw.indexOf("\n---", 3);
    if (close !== -1) return raw.slice(close + 4);
  }
  return raw;
}

function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const token of text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    if (STOP_WORDS.has(token)) continue;
    out.add(token);
  }
  return out;
}

function score(a: Set<string>, b: Set<string>): { containment: number; jaccard: number } {
  if (a.size === 0 || b.size === 0) return { containment: 0, jaccard: 0 };
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return {
    containment: intersection / Math.min(a.size, b.size),
    jaccard: union === 0 ? 0 : intersection / union,
  };
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "you", "your", "are", "that", "this", "from", "into", "can",
  "use", "using", "will", "not", "have", "has", "was", "were", "when", "where", "which",
  "docs", "palantir", "foundry", "overview", "page", "section",
]);

const RISK_TERMS = [
  "legacy",
  "deprecated",
  "planned deprecation",
  "breaking changes",
  "permission",
  "permissions",
  "governance",
  "approval",
  "policy",
  "delete",
  "migration",
  "oauth",
  "application scopes",
  "agent studio",
  "chatbot studio",
];

function countTerms(root: string, rows: Array<{ path?: string | null }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const term of RISK_TERMS) counts[term] = 0;
  for (const row of rows) {
    if (!row.path) continue;
    const text = bodyText(path.join(root, row.path)).toLowerCase();
    for (const term of RISK_TERMS) {
      counts[term]! += (text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    }
  }
  return counts;
}

function loadLegacyRows(): LegacyRow[] {
  const manifest = readJson(path.join(LEGACY_ROOT, "_manifest.json"));
  return manifest.entries ?? [];
}

function nearestOfficial(
  legacy: LegacyRow,
  officialRows: OfficialRow[],
  officialTokens: Map<string, Set<string>>,
): { row: OfficialRow | null; containment: number; jaccard: number } {
  if (!legacy.path) return { row: null, containment: 0, jaccard: 0 };
  const legacySet = tokens(bodyText(path.join(LEGACY_ROOT, legacy.path)));
  let best: { row: OfficialRow | null; containment: number; jaccard: number } = {
    row: null,
    containment: 0,
    jaccard: 0,
  };
  for (const official of officialRows) {
    if (!official.path) continue;
    const key = official.path;
    let officialSet = officialTokens.get(key);
    if (!officialSet) {
      officialSet = tokens(bodyText(path.join(OFFICIAL_ROOT, key)));
      officialTokens.set(key, officialSet);
    }
    const s = score(legacySet, officialSet);
    if (s.containment > best.containment || (s.containment === best.containment && s.jaccard > best.jaccard)) {
      best = { row: official, containment: s.containment, jaccard: s.jaccard };
    }
  }
  return best;
}

function duplicateGroups(rows: LegacyRow[]): Array<{ source: string; rows: LegacyRow[] }> {
  const groups = new Map<string, LegacyRow[]>();
  for (const row of rows) {
    const key = normalizeUrl(row.source ?? row.sourceUrl);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([source, rows]) => ({ source, rows }));
}

function main(): void {
  fs.mkdirSync(PLAN_ROOT, { recursive: true });
  const officialManifest = readJson(path.join(OFFICIAL_ROOT, "_manifest.json"));
  const officialRows: OfficialRow[] = officialManifest.docs ?? [];
  const legacyRows = loadLegacyRows();
  const officialByUrl = new Map<string, OfficialRow>();
  for (const row of officialRows) {
    for (const candidate of [row.sourceUrl, row.canonicalUrl]) {
      const key = normalizeUrl(candidate);
      if (key) officialByUrl.set(key, row);
    }
  }

  const matched: MatchRow[] = [];
  const legacyOnly: MatchRow[] = [];
  const officialMatched = new Set<OfficialRow>();
  const officialTokenCache = new Map<string, Set<string>>();

  for (const legacy of legacyRows) {
    const key = normalizeUrl(legacy.source ?? legacy.sourceUrl);
    const exact = key ? officialByUrl.get(key) : undefined;
    if (exact) {
      officialMatched.add(exact);
      const s = legacy.path && exact.path
        ? score(tokens(bodyText(path.join(LEGACY_ROOT, legacy.path))), tokens(bodyText(path.join(OFFICIAL_ROOT, exact.path))))
        : { containment: 0, jaccard: 0 };
      matched.push({
        legacyPath: legacy.path ?? null,
        legacySource: legacy.source ?? legacy.sourceUrl ?? null,
        officialPath: exact.path,
        officialSource: exact.sourceUrl,
        tokenContainment: s.containment,
        jaccard: s.jaccard,
        verdict: "exact-url",
      });
      continue;
    }
    const near = nearestOfficial(legacy, officialRows, officialTokenCache);
    if (near.row && near.containment >= 0.9) {
      officialMatched.add(near.row);
      matched.push({
        legacyPath: legacy.path ?? null,
        legacySource: legacy.source ?? legacy.sourceUrl ?? null,
        officialPath: near.row.path,
        officialSource: near.row.sourceUrl,
        tokenContainment: near.containment,
        jaccard: near.jaccard,
        verdict: "near-content",
      });
    } else {
      legacyOnly.push({
        legacyPath: legacy.path ?? null,
        legacySource: legacy.source ?? legacy.sourceUrl ?? null,
        officialPath: near.row?.path ?? null,
        officialSource: near.row?.sourceUrl ?? null,
        tokenContainment: near.containment,
        jaccard: near.jaccard,
        verdict: "legacy-only",
      });
    }
  }

  const officialOnly = officialRows
    .filter((row) => row.status === "fetched" && !officialMatched.has(row))
    .map((row) => ({
      legacyPath: null,
      legacySource: null,
      officialPath: row.path,
      officialSource: row.sourceUrl,
      tokenContainment: 0,
      jaccard: 0,
      verdict: "official-only" as const,
    }));

  const changedMatched = matched.filter((row) => row.tokenContainment < 0.995);
  const summary = {
    generatedAt: new Date().toISOString(),
    official: {
      totalRows: officialRows.length,
      fetchedRows: officialRows.filter((row) => row.status === "fetched").length,
      noMarkdownRows: officialRows.filter((row) => row.status === "no-markdown").length,
    },
    legacy: {
      rows: legacyRows.length,
      duplicateUrlGroups: duplicateGroups(legacyRows).length,
    },
    exactOrNearMatches: matched.length,
    changedMatchedRows: changedMatched.length,
    legacyOnlyRows: legacyOnly.length,
    officialOnlyFetchedRows: officialOnly.length,
    riskTermCounts: {
      official: countTerms(OFFICIAL_ROOT, officialRows),
      legacy: countTerms(LEGACY_ROOT, legacyRows),
    },
    duplicateLegacyUrlGroups: duplicateGroups(legacyRows),
    legacyOnly: legacyOnly.slice(0, 50),
    changedMatched: changedMatched.slice(0, 200),
    officialOnlySample: officialOnly.slice(0, 200),
  };

  const jsonPath = path.join(PLAN_ROOT, "2026-05-13-palantir-research-overlap-audit.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify({ summary, matches: matched, legacyOnly, officialOnly }, null, 2)}\n`, "utf8");

  const mdPath = path.join(PLAN_ROOT, "2026-05-13-palantir-research-overlap-audit.md");
  fs.writeFileSync(
    mdPath,
    [
      "# Palantir Research Overlap Audit",
      "",
      `- Generated at: ${summary.generatedAt}`,
      `- Official manifest rows: ${summary.official.totalRows}`,
      `- Official fetched body rows: ${summary.official.fetchedRows}`,
      `- Legacy rows: ${summary.legacy.rows}`,
      `- Exact or near matches: ${summary.exactOrNearMatches}`,
      `- Changed matched rows: ${summary.changedMatchedRows}`,
      `- Legacy-only rows: ${summary.legacyOnlyRows}`,
      `- Official-only fetched rows: ${summary.officialOnlyFetchedRows}`,
      `- Duplicate legacy URL groups: ${summary.legacy.duplicateUrlGroups}`,
      "",
      "## Interpretation",
      "",
      "`palantir-official/` should be treated as current official docs SSoT. `palantir-foundry/` is a legacy compatibility layer for older synthesized citations and should not receive new official-doc authority.",
      "",
      "Legacy-only rows are primarily high-risk review targets because the old mirror may use retired route names or synthesized pages that no longer appear in the live sitemap.",
      "",
      "## Risk Term Counts",
      "",
      "```json",
      JSON.stringify(summary.riskTermCounts, null, 2),
      "```",
      "",
      "Full machine output: `~/.claude/plans/2026-05-13-palantir-research-overlap-audit.json`.",
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
}

main();
