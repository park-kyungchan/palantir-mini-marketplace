# palantir-foundry/ — Structure Index

Structural reference for `~/.claude/research/palantir-foundry/`.

`BROWSE.md` is the query router. `INDEX.md` explains scope, provenance, and the role of each subdir.

## Role Contract

- **Fact layer** — verbatim official Palantir docs. No paraphrasing, no interpretation.
- Use for reference when grounding an AI agent's reasoning.
- Defer to `~/.claude/research/palantir-vision/` for analysis/synthesis.
- Defer to project-local ontology/contracts/runtime for application behavior.

## Directory Map

| Path | Scope | Page Count (2026-04-20) |
|------|-------|--------------------------|
| `architecture/` | Foundry architecture center + capability overviews + getting-started | 22 |
| `ontology/` | Current fetched subset: Action Types + FoundryTS. ObjectType / LinkType / Function / ObjectView are not in this batch | ~45 |
| `aip/` | AIP core + AIP Chatbot Studio (legacy `agent-studio` slugs) + AI FDE + AIP Evals + AIP Logic + Model Catalog + AIP Analyst + AIP Assist + Threads + Document Intelligence | ~55 |
| `dev-toolchain/` | Developer Console + Code Repositories + Code Workbook + Code Examples + OSDK React + Foundry Rules + Custom Widgets | 40 |
| `security-deployments/` | Apollo Core + Foundry Administration. Full platform/AIP security is split across other directories | 50 |

Total: ~212 pages.

## Fetch Provenance

- **Source URL pattern**: `https://www.palantir.com/docs/foundry/<path>/` (or `/docs/apollo/<path>/` for Apollo pages).
- **Fetched**: 2026-04-20 via `mcp__scrapling__bulk_get` with `extraction_type="markdown"`, `main_content_only=true`, `timeout=30`, `impersonate="chrome"` (default).
- **Enumeration source**: `palantir.com/docs/sitemap.xml` (547 KB, 4952 English docs URLs at time of fetch).
- **URL partitioning**: `/tmp/palantir-docs-urls/a[1-5]-urls.txt` (checkpointed for future refresh).

## Filename / Slug Convention

- Slug = URL path after `/docs/foundry/` or `/docs/apollo/`, with `/` → `-`, trailing `/` stripped.
- Example: `https://www.palantir.com/docs/foundry/architecture-center/multimodal-data-plane/` → `architecture/architecture-center-multimodal-data-plane.md`.
- Stable slug-URL mapping — allows programmatic refresh (re-fetch → overwrite same slug).

## File frontmatter (all files)

```
---
source: <full URL>
fetched: 2026-04-20
section: <parent subdir slug>
doc_title: <H1 from page>
---

<verbatim markdown body>
```

## Maintenance Rules

- Do NOT edit content manually. If a page changes upstream, refetch via same URL + overwrite.
- If a page is removed upstream, create a refresh report and move the local file into a refresh-owned archive directory in the same PR.
- Add new scraped files additively. Never delete the directory.
- BROWSE.md per subdir is maintained by the library owner (Lead) not by scrapers — scraper agents write initial draft, Lead refines during synthesis.
- `INDEX.md` per subdir is maintained manually and should make coverage limits explicit so agents do not infer missing pages are absent upstream.

## Refresh Workflow

palantir-mini contains research-library handlers for dry-run staleness checks
and manifest-backed refresh. The current bridge accepts canonical `libraryRoot`
calls plus compatibility `source` selectors, and it understands both current
`docs[]` and legacy `entries[]` manifests.

Current live-refresh limitation:

- `_manifest.json` records provenance `source` URLs but no direct write-safe
  `url` fields.
- `source` is not treated as a direct fetch target because official docs pages
  can include navigation or page chrome; overwriting curated markdown from that
  path would be unsafe without a cleaner.
- Dry-run should therefore report stale docs as `staleUnfetchableDocs`, not as
  `wouldRefresh`.

Intended workflow after direct `url` fields or a safe cleaner are added:

1. Re-fetch `sitemap.xml`, diff URL set against `all-en-urls.txt` checkpoint.
2. New URLs → mark as `added:` in a refresh report.
3. Removed URLs → move the local file into the refresh-owned archive directory and record the deletion in the refresh report.
4. Existing URLs → re-fetch with `mcp__scrapling__bulk_get`, diff body against existing. If changed, overwrite + append to the refresh report.
5. Emit `research_library_refreshed` event to project events.jsonl with 5-dim Decision Lineage envelope.

Until direct fetch targets exist, do not claim `research_library_refresh`
completed a live Foundry refresh from Codex or Claude. A successful dry-run only
proves the manifest was inspected.

## Restructure 2026-04-20

Created as part of the research library SSoT restructure. Replaces the older monolithic Palantir research directory where factual primitives were paraphrased. That old layout is not an active router in this checkout; recover it from git history only when historical comparison is required. Interpretation/synthesis content (philosophy, talks, our analysis) moved to `palantir-vision/`.
