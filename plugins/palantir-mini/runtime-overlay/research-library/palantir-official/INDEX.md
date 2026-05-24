# Palantir Official Docs — INDEX

Structure and provenance index for the generated official Palantir docs SSoT.

## Provenance

- Sitemap: https://www.palantir.com/docs/sitemap.xml
- Sitemap lastmod max: 2026-05-12T17:06:26.167Z
- Generated at: 2026-05-12T23:57:50.244Z
- Fetch method: HTTP fetch of public pages, extracting `props.pageProps.markdown` from `__NEXT_DATA__`.
- Seed verification: Scrapling MCP checked robots, sitemap, and representative docs pages before generation.

## Counts

- Manifest rows: 4974
- Markdown body files: 3533
- Manifest-only rows: 1441
- Failed rows: 0

## Product Map

| Product | Rows | Body files |
|---|---:|---:|
| `foundry` | 4382 | 3258 |
| `gotham` | 267 | 12 |
| `apollo` | 264 | 263 |
| `defense-osdk` | 59 | 0 |
| `docs` | 1 | 0 |
| `versions` | 1 | 0 |

## Generated Files

- `_manifest.json` — canonical machine index for all included sitemap rows.
- `_crawl-audit.json` — generation audit with filters, counts, failures, and upstream freshness.
- `BROWSE.md` — minimal read router.
- `INDEX.md` — this structural/provenance file.
- `<product>/<area>/<slug>.md` — generated official markdown mirrors when upstream exposes markdown.

## Compatibility Boundary

`../palantir-foundry/` remains a frozen compatibility mirror for existing citations and older synthesis routes. Current official facts should resolve to `palantir-official/`; use the overlap audit report before deleting or rewriting legacy references.

