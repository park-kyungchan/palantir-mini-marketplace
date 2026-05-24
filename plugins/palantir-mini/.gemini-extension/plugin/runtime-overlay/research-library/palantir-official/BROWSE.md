# Palantir Official Docs — BROWSE

> Generated from `https://www.palantir.com/docs/sitemap.xml` and page `__NEXT_DATA__.markdown`. Do not hand-edit generated body files; rerun `import-palantir-official-docs.ts`.

## Role

`palantir-official/` is the current official Palantir public docs SSoT for `palantir.com/docs/**` across Foundry, Apollo, Gotham, Defense OSDK, and API reference pages. Use this before legacy `palantir-foundry/` mirrors.

## Freshness

- Generated at: 2026-05-12T23:57:50.244Z
- Sitemap lastmod max: 2026-05-12T17:06:26.167Z
- Total sitemap rows imported: 4974
- Markdown body files: 3533
- Non-markdown / API index rows retained in manifest only: 1441
- Failed rows: 0

## Product Routes

| Product | Manifest rows | Open first |
|---|---:|---|
| `foundry` | 4382 | `foundry/` or manifest query |
| `gotham` | 267 | `gotham/` or manifest query |
| `apollo` | 264 | `apollo/` or manifest query |
| `defense-osdk` | 59 | `defense-osdk/` or manifest query |
| `docs` | 1 | `docs/` or manifest query |
| `versions` | 1 | `versions/` or manifest query |

## High-Signal Read Starts

| Question | Open first |
|---|---|
| AIP architecture baseline | `foundry/architecture-center/aip-architecture.md` |
| Ontology overview / digital twin wording | `foundry/ontology/overview.md` |
| AI FDE modes and skills | `foundry/ai-fde/overview.md` + `foundry/ai-fde/modes-and-skills.md` |
| AIP Evals | `foundry/aip-evals/overview.md` |
| Palantir MCP / Ontology MCP | `foundry/ontology-mcp/overview.md` when present; otherwise query `_manifest.json` for `mcp` |
| Global Branching | query `_manifest.json` for `global-branching` and then open the exact matched body file |
| Apollo docs | `apollo/` subtree |
| Gotham docs | `gotham/` subtree |
| API reference / generated reference rows | `_manifest.json` first; body may be absent when upstream page provides no markdown payload |

## Retrieval Rules

- Read this router and `INDEX.md`, then open only the exact page(s) required by the question.
- Search `_manifest.json` by `sourceUrl`, `canonicalUrl`, title, product, and local `path` before broad filesystem scans.
- Body files are generated mirrors. If upstream changes, rerun the importer and overlap audit instead of patching a page manually.
- `palantir-foundry/` is now legacy compatibility and synthesis-citation bridge; do not add new active official docs there.

