---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-categorical-formula-plot/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-categorical-formula-plot/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b06c974dd8b6ac2c6af85e3c72535b3efa0fe5b70bbdb0dc983351c39803f9b2"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Categorical formula plot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Categorical formula plot

Create a new categorical (bar, line, scatter) plot by computing a formula on overlapping categories of existing categorical plots. Numerics, from aggregations or parameters, can also be in the formula.

## Input type

Categorical chart, number

## Output type

Categorical chart, object selection

## Examples

In the example below, we add two bar plots together and multiply by the value of a numeric parameter. When writing formulas here, computation between bar plots will be run on matching segments and group-by categories. Single numerical values will be applied to all bars.

![Categorical formula plot example](/docs/resources/foundry/quiver/resource-categorical-formula-plot-example.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
