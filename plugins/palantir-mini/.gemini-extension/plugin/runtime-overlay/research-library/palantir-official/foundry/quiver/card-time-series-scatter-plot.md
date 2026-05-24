---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-time-series-scatter-plot/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-time-series-scatter-plot/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5a8527946c81867f9c872ae91fd584727a47e43de430ce5e8d514daa171e7c4c"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Time series scatter plot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time series scatter plot

Scatter plots can be used to plot two series against each other. Points of the underlying series will automatically be aggregated (using the average value over buckets that are 1/1000 of the underlying time range) before plotting.

* Both the bucketing strategy (the number of buckets and points per bucket), and the bucket value (for example, average, sum, max) can be specified.
* The range for each series included in the cross plot is automatically set to underlying the plot zoom range, but can be modified to a manual [range](/docs/foundry/quiver/timeseries-ranges/) instead.

## Input type

Time series

## Output type

Time series scatter plot

## Examples

![Time series scatter plot example](/docs/resources/foundry/quiver/card-ts-scatter-plot.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

* [Scatter plot regression](/docs/foundry/quiver/card-scatter-plot-regression/)
* [Time series heat grid](/docs/foundry/quiver/card-time-series-heat-grid/)
