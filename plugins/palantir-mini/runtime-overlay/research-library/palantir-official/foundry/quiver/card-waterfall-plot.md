---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-waterfall-plot/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-waterfall-plot/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fa64c598c064d8fff6cdf71747cafdaec02012905784115bda77025c556a3f52"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Waterfall plot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Waterfall plot

Create a waterfall plot by defining series on an object set, or by specifying numeric values.  When constructed from an object set, its possible to group by a property and calculate a metric (average, count, min, max, sum, unique count) to calculate the buckets.  Its also possible to "compute total" which will add an additional bucket which computes the total of all buckets in the series.

## Input type

Object set, number

## Output type

Flow end

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
