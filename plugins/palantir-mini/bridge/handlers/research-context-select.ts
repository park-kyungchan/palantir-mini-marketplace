// palantir-mini — MCP tool handler: research_context_select
// Returns the smallest research/schema read set for Palantir-heavy tasks.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  resolveResearchAnchor,
  type ResearchAuthorityMode,
  type ResearchSourceReadiness,
} from "../../lib/runtime-overlay/research-core-select";

interface ResearchContextSelectInput {
  query?: string;
  topic?: string;
  maxFiles?: number;
  includeSchemas?: boolean;
  includeLatestWatch?: boolean;
  authorityMode?: ResearchAuthorityMode;
}

interface SelectedFile {
  path: string;
  exists: boolean;
  role: "router" | "index" | "official-doc" | "schema" | "report";
  reason: string;
}

interface ManifestDoc {
  sourceUrl?: string;
  canonicalUrl?: string;
  title?: string | null;
  path?: string | null;
  product?: string;
  docsArea?: string;
  status?: string;
}

interface ResearchContextSelectResult {
  topic: string;
  query: string;
  source: string;
  provenance: string;
  authorityMode: ResearchAuthorityMode;
  ssotSatisfied: boolean;
  sourceReadiness: ResearchSourceReadiness;
  fallbackReason?: string;
  currentnessGap?: string;
  researchReadProof: {
    authorityMode: ResearchAuthorityMode;
    source: string;
    provenance: string;
    topic: string;
    query: string;
    anchorPaths: string[];
  };
  files: SelectedFile[];
  currentnessNotes: string[];
  latestSignalCadence?: string[];
  runtimeGap?: string;
}

const HOME = process.env.HOME ?? os.homedir();
const RESEARCH_ROOT = path.join(HOME, ".claude", "research");
const OFFICIAL_ROOT = path.join(RESEARCH_ROOT, "palantir-official");
const MANIFEST_PATH = path.join(OFFICIAL_ROOT, "_manifest.json");

function file(pathname: string, role: SelectedFile["role"], reason: string): SelectedFile {
  return {
    path: pathname,
    exists: fs.existsSync(pathname),
    role,
    reason,
  };
}

function readManifestDocs(): ManifestDoc[] {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as { docs?: ManifestDoc[] };
    return manifest.docs ?? [];
  } catch {
    return [];
  }
}

function readManifestHeader(): Record<string, unknown> {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Record<string, unknown>;
    return manifest;
  } catch {
    return {};
  }
}

function normalizeQuery(query: string): string[] {
  const tokens = query.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  return [...new Set(tokens.filter((token) => !STOP.has(token)))];
}

const STOP = new Set(["the", "and", "for", "with", "docs", "palantir", "foundry", "official", "what", "how"]);

function synonyms(query: string): string[] {
  const lower = query.toLowerCase();
  const out: string[] = [];
  if (/\baip\b|agent|llm/.test(lower)) out.push("aip", "architecture-center/aip-architecture", "ai-fde", "aip-evals");
  if (/ontology|digital twin|object type|action type|link type/.test(lower)) out.push("ontology", "object-link-types", "action-types", "functions");
  if (/mcp|developer|osdk|api/.test(lower)) out.push("mcp", "developers", "osdk", "api-reference");
  if (/branch|proposal|approval/.test(lower)) out.push("global-branching", "approval", "proposal");
  if (/eval|simulation|rubric|grader/.test(lower)) out.push("aip-evals", "simulation", "metric");
  if (/apollo|deploy|release/.test(lower)) out.push("apollo", "release");
  if (/gotham/.test(lower)) out.push("gotham");
  if (/defense|osdk/.test(lower)) out.push("defense-osdk");
  return out;
}

function scoreDoc(doc: ManifestDoc, terms: string[]): number {
  if (doc.status !== "fetched" || !doc.path) return -1;
  const haystack = [
    doc.path,
    doc.sourceUrl,
    doc.canonicalUrl,
    doc.title,
    doc.product,
    doc.docsArea,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += term.includes("/") ? 6 : 2;
  }
  if (doc.path.endsWith("/overview.md") || doc.path.endsWith("overview.md")) score += 1;
  return score;
}

function selectedOfficialDocs(query: string, maxFiles: number): SelectedFile[] {
  const docs = readManifestDocs();
  const terms = [...normalizeQuery(query), ...synonyms(query)];
  const scored = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, terms) }))
    .filter((row) => row.score > 0 && row.doc.path)
    .sort((a, b) => b.score - a.score || String(a.doc.path).localeCompare(String(b.doc.path)))
    .slice(0, Math.max(0, maxFiles));
  return scored.map(({ doc, score }) =>
    file(path.join(OFFICIAL_ROOT, doc.path!), "official-doc", `matched query terms; score=${score}`),
  );
}

function schemaFiles(query: string): SelectedFile[] {
  const lower = query.toLowerCase();
  const schemaRoot = path.join(HOME, ".claude", "schemas", "ontology", "primitives");
  const candidates = [
    ["semantic-intent-contract.ts", /intent|clarif|question|meaning|prompt/],
    ["digital-twin-change-contract.ts", /digital twin|change contract|dtc|ontology/],
    ["research-source-manifest.ts", /research|manifest|stale|citation/],
    ["canonical-source-registry.ts", /canonical|source|registry|citation/],
    ["propagation-audit.ts", /propagation|forward|backward|audit/],
  ] as const;
  return candidates
    .filter(([, pattern]) => pattern.test(lower))
    .map(([name]) => file(path.join(schemaRoot, name), "schema", "schema primitive implied by query"));
}

export default async function researchContextSelect(
  rawArgs: unknown,
): Promise<ResearchContextSelectResult> {
  const args = (rawArgs ?? {}) as ResearchContextSelectInput;
  const query = args.query?.trim() || "Palantir official docs context";
  const topic = args.topic?.trim() || "palantir-official";
  const maxFiles = Math.max(1, Math.min(args.maxFiles ?? 12, 30));
  const authorityMode = args.authorityMode ?? "external-preferred";
  const anchor = await resolveResearchAnchor(query, topic, { authorityMode });
  const manifest = readManifestHeader();
  const files: SelectedFile[] = [
    file(path.join(RESEARCH_ROOT, "BROWSE.md"), "router", "top-level research router"),
    file(path.join(RESEARCH_ROOT, "INDEX.md"), "index", "top-level research provenance index"),
    file(path.join(OFFICIAL_ROOT, "BROWSE.md"), "router", "current official docs router"),
    file(path.join(OFFICIAL_ROOT, "INDEX.md"), "index", "current official docs provenance"),
    ...selectedOfficialDocs(query, maxFiles),
  ];

  if (args.includeSchemas) files.push(...schemaFiles(query));
  const overlapReport = path.join(HOME, ".claude", "plans", "2026-05-13-palantir-research-overlap-audit.md");
  if (fs.existsSync(overlapReport)) {
    files.push(file(overlapReport, "report", "legacy/current overlap and conflict report"));
  }

  const deduped = [...new Map(files.map((entry) => [entry.path, entry])).values()];
  const currentnessNotes = [
    `resolverSource=${anchor.source}`,
    `resolverProvenance=${anchor.provenance}`,
    `resolverAuthorityMode=${anchor.authorityMode}`,
    `ssotSatisfied=${String(anchor.ssotSatisfied)}`,
    `sourceReadiness=${anchor.sourceReadiness}`,
    `officialManifestGeneratedAt=${String(manifest.generatedAt ?? "unknown")}`,
    `officialSitemapLastmod=${String(manifest.sitemapLastmod ?? "unknown")}`,
    `officialRows=${String(manifest.total ?? "unknown")}`,
    `officialFetched=${String(manifest.fetched ?? "unknown")}`,
    `officialNoMarkdown=${String(manifest.noMarkdown ?? "unknown")}`,
    ...(anchor.fallbackReason ? [`fallbackReason=${anchor.fallbackReason}`] : []),
    ...(anchor.currentnessGap ? [`currentnessGap=${anchor.currentnessGap}`] : []),
  ];

  return {
    topic,
    query,
    source: anchor.source,
    provenance: anchor.provenance,
    authorityMode: anchor.authorityMode,
    ssotSatisfied: anchor.ssotSatisfied,
    sourceReadiness: anchor.sourceReadiness,
    ...(anchor.fallbackReason ? { fallbackReason: anchor.fallbackReason } : {}),
    ...(anchor.currentnessGap ? { currentnessGap: anchor.currentnessGap } : {}),
    researchReadProof: {
      authorityMode: anchor.authorityMode,
      source: anchor.source,
      provenance: anchor.provenance,
      topic,
      query,
      anchorPaths: anchor.files.map((entry) => entry.path),
    },
    files: deduped,
    currentnessNotes,
    ...(args.includeLatestWatch
      ? {
          latestSignalCadence: [
            "Before Palantir-heavy work, refresh or inspect palantir-official/_manifest.json sitemapLastmod.",
            "For DevCon/AIPCon/latest claims, verify official Palantir announcements before promotion.",
            "After SSoT changes, rerun import-palantir-official-docs and audit-palantir-research-overlap.",
          ],
        }
      : {}),
    ...(!anchor.ssotSatisfied || anchor.source === "plugin-snapshot"
      ? { runtimeGap: "External palantir-official SSoT was not selected; check resolver env/cache or reload current runtime." }
      : {}),
  };
}
