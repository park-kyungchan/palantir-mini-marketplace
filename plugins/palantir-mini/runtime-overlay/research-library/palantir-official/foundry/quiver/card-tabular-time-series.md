---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-tabular-time-series/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-tabular-time-series/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3f65bfac71892a5564a5396250fdd0eeab697eb0d7e2e6f614a48af4d405eb5a"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Tabular time series"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Tabular time series

Select a timestamp and a value column from an input transform table and return a time series.

## Input type

Object set, transform table

## Output type

Time series

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported\* |

\* In the transform table, this transform is called "group to time series", and must be performed on a date group and numeric group column (result of a group by transform).
