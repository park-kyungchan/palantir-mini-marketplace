---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-numeric-aggregation/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-numeric-aggregation/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0970df2e136df080578ee84d38bfb0e5ad6d38145c5f3d09da28707f5a897a49"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Numeric aggregation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Numeric aggregation

Returns a single number that represents an aggregation of an input object set.  If an aggregation is performed on a time property (e.g. max of date) the result will render as a date, however the underlying data value will still be treated as a numeric in Quiver.

## Input type

Object set

## Output type

Number

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
