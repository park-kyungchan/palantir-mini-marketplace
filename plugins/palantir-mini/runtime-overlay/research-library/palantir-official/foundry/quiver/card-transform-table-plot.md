---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-transform-table-plot/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-transform-table-plot/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c2786a00c7b9811c80f7cd24471afd3d11c87ebd41c5b78a773e34b9f0f8d002"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Categorical plot from transform table"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Categorical plot from transform table

Create a categorical chart (bar, line, or scatter) using data from a transform table. In the editor, use the **Data** tab to select the input transform table, and define the groups as well as segments (optional). Use the **Display** tab to change the visualization type and other display options.

* Supported aggregation metrics: min, max, sum, average, count, unique count, percentile, standard deviation, and variance

:::callout{theme="warning"}
The categorical plot from transform table does not currently support selection filtering. If your workflow requires selection on a chart created from a transform table, consider using [Vega plots](/docs/foundry/quiver/cards-vega-plot/) instead.
:::

## Input type

Transform table

## Output type

Categorical chart

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
