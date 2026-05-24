---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-group-by/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-group-by/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "777a7b5b8220441b12bc4f0ab9646505a28514d41b49dcf8423924ff5fb41be5"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Group by"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Group by

Group transform table rows on zero or more columns. Other columns will be converted into arrays by group.

Array columns in the transform table can then be further operated on by transforms in the [array operations](/docs/foundry/quiver/cards-transform-table-index-array-operations/) category. For example, to create a sum of a numeric column, use a [number array aggregation](/docs/foundry/quiver/card-number-array-aggregation/) on the number array column created by the group by transform.

## Input type

Transform table

## Output type

Transform table

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Unsupported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
