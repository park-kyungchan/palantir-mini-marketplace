#!/usr/bin/env bun
// Import Palantir public docs into ~/.claude/research/palantir-official.
// Source of truth: https://www.palantir.com/docs/sitemap.xml + page __NEXT_DATA__.markdown.

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

interface DocRow {
  sourceUrl: string;
  canonicalUrl: string;
  sourceLastmod: string | null;
  fetchedAt: string;
  product: string;
  docsArea: string;
  locale: "en";
  title: string | null;
  path: string | null;
  contentHash: string | null;
  status: "fetched" | "no-markdown" | "failed";
  error?: string;
}

const HOME = process.env.HOME ?? os.homedir();
const RESEARCH_ROOT = process.env.PALANTIR_OFFICIAL_RESEARCH_ROOT
  ? expandHome(process.env.PALANTIR_OFFICIAL_RESEARCH_ROOT)
  : path.join(HOME, ".claude", "research", "palantir-official");
const PLAN_ROOT = path.join(HOME, ".claude", "plans");
const SITEMAP_URL =
  process.env.PALANTIR_OFFICIAL_SITEMAP_URL ??
  "https://www.palantir.com/docs/sitemap.xml";
const CONCURRENCY = Number.parseInt(process.env.PALANTIR_OFFICIAL_CONCURRENCY ?? "32", 10);
const MAX_URLS = Number.parseInt(process.env.PALANTIR_OFFICIAL_MAX_URLS ?? "0", 10);
const NOW = new Date().toISOString();

function expandHome(value: string): string {
  return value.startsWith("~/") ? path.join(HOME, value.slice(2)) : value;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = "https:";
  parsed.hostname = "www.palantir.com";
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "/");
}

function canonicalUrl(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = "https:";
  parsed.hostname = "palantir.com";
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "/");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  for (const block of urlBlocks) {
    const loc = /<loc>(.*?)<\/loc>/s.exec(block)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = /<lastmod>(.*?)<\/lastmod>/s.exec(block)?.[1]?.trim() ?? null;
    entries.push({ loc: normalizeUrl(loc), lastmod });
  }
  return entries;
}

function includeEntry(entry: SitemapEntry): boolean {
  const url = new URL(entry.loc);
  if (!url.pathname.startsWith("/docs/")) return false;
  if (/^\/docs\/(jp|kr|zh)\//.test(url.pathname)) return false;
  if (/^\/docs\/(search|feedback|500)\//.test(url.pathname)) return false;
  if (/\/search\/?$/.test(url.pathname)) return false;
  if (/\/feedback\/?$/.test(url.pathname)) return false;
  return true;
}

function relativeDocPath(url: string): string {
  const parsed = new URL(url);
  let rel = parsed.pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  if (!rel) rel = "docs";
  return `${rel
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^A-Za-z0-9._-]/g, "-"))
    .join("/")}.md`;
}

function classify(url: string): { product: string; docsArea: string } {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const product = parts[1] ?? "docs";
  const docsArea = parts[2] ?? product;
  return { product, docsArea };
}

function titleFromNextData(data: any): string | null {
  const pageProps = data?.props?.pageProps;
  return (
    pageProps?.metadata?.data?.pageTitle ??
    pageProps?.docTitle ??
    pageProps?.title ??
    pageProps?.page?.title ??
    null
  );
}

function markdownFromHtml(html: string): { markdown: string | null; title: string | null } {
  const match = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return { markdown: null, title: null };
  try {
    const data = JSON.parse(decodeHtmlEntities(match[1] ?? ""));
    const markdown = data?.props?.pageProps?.markdown;
    return {
      markdown: typeof markdown === "string" && markdown.trim().length > 0 ? markdown : null,
      title: titleFromNextData(data),
    };
  } catch {
    return { markdown: null, title: null };
  }
}

function yamlString(value: string | null): string {
  return value === null ? "null" : JSON.stringify(value);
}

function frontmatter(row: DocRow): string {
  return [
    "---",
    `sourceUrl: ${yamlString(row.sourceUrl)}`,
    `canonicalUrl: ${yamlString(row.canonicalUrl)}`,
    `sourceLastmod: ${yamlString(row.sourceLastmod)}`,
    `fetchedAt: ${yamlString(row.fetchedAt)}`,
    'fetcher: "palantir-mini import-palantir-official-docs"',
    'extractor: "next-data-markdown"',
    `contentHash: ${yamlString(row.contentHash)}`,
    `product: ${yamlString(row.product)}`,
    `docsArea: ${yamlString(row.docsArea)}`,
    `locale: ${yamlString(row.locale)}`,
    `upstreamTitle: ${yamlString(row.title)}`,
    'licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."',
    "---",
    "",
  ].join("\n");
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "palantir-mini-research-import/1.0 (+local SSoT refresh)",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
      if ((index + 1) % 250 === 0) {
        console.error(`[palantir-official] processed ${index + 1}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, limit) }, () => worker()));
  return results;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function countBy<T extends string>(rows: DocRow[], key: (row: DocRow) => T): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const row of rows) out[key(row)] = (out[key(row)] ?? 0) + 1;
  return out;
}

function writeBrowse(rows: DocRow[], sitemapLastmod: string | null): void {
  const fetched = rows.filter((row) => row.status === "fetched");
  const productCounts = countBy(rows, (row) => row.product);
  const statusCounts = countBy(rows, (row) => row.status);
  const lines = [
    "# Palantir Official Docs — BROWSE",
    "",
    "> Generated from `https://www.palantir.com/docs/sitemap.xml` and page `__NEXT_DATA__.markdown`. Do not hand-edit generated body files; rerun `import-palantir-official-docs.ts`.",
    "",
    "## Role",
    "",
    "`palantir-official/` is the current official Palantir public docs SSoT for `palantir.com/docs/**` across Foundry, Apollo, Gotham, Defense OSDK, and API reference pages. Use this before legacy `palantir-foundry/` mirrors.",
    "",
    "## Freshness",
    "",
    `- Generated at: ${NOW}`,
    `- Sitemap lastmod max: ${sitemapLastmod ?? "unknown"}`,
    `- Total sitemap rows imported: ${rows.length}`,
    `- Markdown body files: ${fetched.length}`,
    `- Non-markdown / API index rows retained in manifest only: ${statusCounts["no-markdown"] ?? 0}`,
    `- Failed rows: ${statusCounts.failed ?? 0}`,
    "",
    "## Product Routes",
    "",
    "| Product | Manifest rows | Open first |",
    "|---|---:|---|",
    ...Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([product, count]) => `| \`${product}\` | ${count} | \`${product}/\` or manifest query |`),
    "",
    "## High-Signal Read Starts",
    "",
    "| Question | Open first |",
    "|---|---|",
    "| AIP architecture baseline | `foundry/architecture-center/aip-architecture.md` |",
    "| Ontology overview / digital twin wording | `foundry/ontology/overview.md` |",
    "| AI FDE modes and skills | `foundry/ai-fde/overview.md` + `foundry/ai-fde/modes-and-skills.md` |",
    "| AIP Evals | `foundry/aip-evals/overview.md` |",
    "| Palantir MCP / Ontology MCP | `foundry/ontology-mcp/overview.md` when present; otherwise query `_manifest.json` for `mcp` |",
    "| Global Branching | query `_manifest.json` for `global-branching` and then open the exact matched body file |",
    "| Apollo docs | `apollo/` subtree |",
    "| Gotham docs | `gotham/` subtree |",
    "| API reference / generated reference rows | `_manifest.json` first; body may be absent when upstream page provides no markdown payload |",
    "",
    "## Retrieval Rules",
    "",
    "- Read this router and `INDEX.md`, then open only the exact page(s) required by the question.",
    "- Search `_manifest.json` by `sourceUrl`, `canonicalUrl`, title, product, and local `path` before broad filesystem scans.",
    "- Body files are generated mirrors. If upstream changes, rerun the importer and overlap audit instead of patching a page manually.",
    "- `palantir-foundry/` is now legacy compatibility and synthesis-citation bridge; do not add new active official docs there.",
    "",
  ];
  fs.writeFileSync(path.join(RESEARCH_ROOT, "BROWSE.md"), `${lines.join("\n")}\n`, "utf8");
}

function writeIndex(rows: DocRow[], sitemapLastmod: string | null): void {
  const fetched = rows.filter((row) => row.status === "fetched");
  const productCounts = countBy(rows, (row) => row.product);
  const lines = [
    "# Palantir Official Docs — INDEX",
    "",
    "Structure and provenance index for the generated official Palantir docs SSoT.",
    "",
    "## Provenance",
    "",
    `- Sitemap: ${SITEMAP_URL}`,
    `- Sitemap lastmod max: ${sitemapLastmod ?? "unknown"}`,
    `- Generated at: ${NOW}`,
    "- Fetch method: HTTP fetch of public pages, extracting `props.pageProps.markdown` from `__NEXT_DATA__`.",
    "- Seed verification: Scrapling MCP checked robots, sitemap, and representative docs pages before generation.",
    "",
    "## Counts",
    "",
    `- Manifest rows: ${rows.length}`,
    `- Markdown body files: ${fetched.length}`,
    `- Manifest-only rows: ${rows.filter((row) => row.status === "no-markdown").length}`,
    `- Failed rows: ${rows.filter((row) => row.status === "failed").length}`,
    "",
    "## Product Map",
    "",
    "| Product | Rows | Body files |",
    "|---|---:|---:|",
    ...Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([product, count]) => {
        const bodyCount = fetched.filter((row) => row.product === product).length;
        return `| \`${product}\` | ${count} | ${bodyCount} |`;
      }),
    "",
    "## Generated Files",
    "",
    "- `_manifest.json` — canonical machine index for all included sitemap rows.",
    "- `_crawl-audit.json` — generation audit with filters, counts, failures, and upstream freshness.",
    "- `BROWSE.md` — minimal read router.",
    "- `INDEX.md` — this structural/provenance file.",
    "- `<product>/<area>/<slug>.md` — generated official markdown mirrors when upstream exposes markdown.",
    "",
    "## Compatibility Boundary",
    "",
    "`../palantir-foundry/` remains a frozen compatibility mirror for existing citations and older synthesis routes. Current official facts should resolve to `palantir-official/`; use the overlap audit report before deleting or rewriting legacy references.",
    "",
  ];
  fs.writeFileSync(path.join(RESEARCH_ROOT, "INDEX.md"), `${lines.join("\n")}\n`, "utf8");
}

async function importOne(entry: SitemapEntry): Promise<DocRow> {
  const sourceUrl = normalizeUrl(entry.loc);
  const canonical = canonicalUrl(sourceUrl);
  const { product, docsArea } = classify(sourceUrl);
  try {
    const html = await fetchText(sourceUrl);
    const { markdown, title } = markdownFromHtml(html);
    if (!markdown) {
      return {
        sourceUrl,
        canonicalUrl: canonical,
        sourceLastmod: entry.lastmod,
        fetchedAt: NOW,
        product,
        docsArea,
        locale: "en",
        title,
        path: null,
        contentHash: null,
        status: "no-markdown",
      };
    }
    const relPath = relativeDocPath(sourceUrl);
    const row: DocRow = {
      sourceUrl,
      canonicalUrl: canonical,
      sourceLastmod: entry.lastmod,
      fetchedAt: NOW,
      product,
      docsArea,
      locale: "en",
      title,
      path: relPath,
      contentHash: sha256(markdown),
      status: "fetched",
    };
    const fullPath = path.join(RESEARCH_ROOT, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${frontmatter(row)}${markdown.trim()}\n`, "utf8");
    return row;
  } catch (error) {
    return {
      sourceUrl,
      canonicalUrl: canonical,
      sourceLastmod: entry.lastmod,
      fetchedAt: NOW,
      product,
      docsArea,
      locale: "en",
      title: null,
      path: null,
      contentHash: null,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(RESEARCH_ROOT, { recursive: true });
  fs.mkdirSync(PLAN_ROOT, { recursive: true });
  console.error(`[palantir-official] fetching sitemap ${SITEMAP_URL}`);
  const sitemapXml = await fetchText(SITEMAP_URL);
  let entries = parseSitemap(sitemapXml).filter(includeEntry);
  entries = [...new Map(entries.map((entry) => [entry.loc, entry])).values()];
  entries.sort((a, b) => a.loc.localeCompare(b.loc));
  if (MAX_URLS > 0) entries = entries.slice(0, MAX_URLS);
  const sitemapLastmod = entries
    .map((entry) => entry.lastmod)
    .filter((value): value is string => typeof value === "string")
    .sort()
    .at(-1) ?? null;

  console.error(`[palantir-official] importing ${entries.length} URLs with concurrency=${CONCURRENCY}`);
  const rows = await mapConcurrent(entries, CONCURRENCY, importOne);
  rows.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));

  const manifest = {
    schemaVersion: "palantir-official-docs/v1",
    generatedAt: NOW,
    sitemapUrl: SITEMAP_URL,
    sitemapLastmod,
    root: RESEARCH_ROOT,
    total: rows.length,
    fetched: rows.filter((row) => row.status === "fetched").length,
    noMarkdown: rows.filter((row) => row.status === "no-markdown").length,
    failed: rows.filter((row) => row.status === "failed").length,
    docs: rows,
  };

  writeJson(path.join(RESEARCH_ROOT, "_manifest.json"), manifest);
  writeJson(path.join(RESEARCH_ROOT, "_crawl-audit.json"), {
    generatedAt: NOW,
    source: {
      robots: "https://www.palantir.com/robots.txt",
      sitemap: SITEMAP_URL,
      sitemapLastmod,
      scraplingSeedCheck: [
        "https://www.palantir.com/robots.txt",
        "https://www.palantir.com/docs/sitemap.xml",
        "https://www.palantir.com/docs/foundry/architecture-center/aip-architecture/",
        "https://www.palantir.com/docs/foundry/ontology/overview/",
      ],
    },
    filters: {
      include: "/docs/** English public docs",
      exclude: ["/docs/jp/**", "/docs/kr/**", "/docs/zh/**", "/docs/search/**", "/docs/feedback/**", "/docs/500/**"],
    },
    counts: {
      total: manifest.total,
      fetched: manifest.fetched,
      noMarkdown: manifest.noMarkdown,
      failed: manifest.failed,
      byProduct: countBy(rows, (row) => row.product),
      byStatus: countBy(rows, (row) => row.status),
    },
    failures: rows.filter((row) => row.status === "failed"),
  });
  writeBrowse(rows, sitemapLastmod);
  writeIndex(rows, sitemapLastmod);

  const reportPath = path.join(PLAN_ROOT, "2026-05-13-palantir-official-import-report.md");
  fs.writeFileSync(
    reportPath,
    [
      "# Palantir Official Docs Import Report",
      "",
      `- Generated at: ${NOW}`,
      `- Sitemap lastmod max: ${sitemapLastmod ?? "unknown"}`,
      `- Rows: ${manifest.total}`,
      `- Markdown body files: ${manifest.fetched}`,
      `- Manifest-only rows: ${manifest.noMarkdown}`,
      `- Failed rows: ${manifest.failed}`,
      "",
      "The durable SSoT lives at `~/.claude/research/palantir-official/`.",
      "",
    ].join("\n"),
    "utf8",
  );
  console.error(`[palantir-official] complete fetched=${manifest.fetched} noMarkdown=${manifest.noMarkdown} failed=${manifest.failed}`);
}

void main();
