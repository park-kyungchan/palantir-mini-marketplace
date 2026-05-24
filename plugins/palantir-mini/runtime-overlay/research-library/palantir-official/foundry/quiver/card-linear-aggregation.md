---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-linear-aggregation/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-linear-aggregation/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3438f1122991e275e8ba1414c114410f02a07617e9fc0a000db9ff1f7e114efe"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Linear aggregation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Linear aggregation

Takes multiple time series, either from a transform table column, a grouped time series plot, an object set with time series, or manual inputs, and computes a linear aggregation of the time series set over time. You can add a linear aggregation from the **Next Actions** menu by selecting **Visualize > Linear aggregation**. Note that while a rolling or periodic aggregate transforms aggregate over a single time series, the linear aggregation aggregates across multiple time series.

[Learn more about how interpolation affects this operation.](/docs/foundry/quiver/cards-interpolation-usage/#linear-aggregation)

For a comprehensive guide on batch time series analysis, including other aggregation approaches and visualization methods, see [batch analyze time series](/docs/foundry/quiver/timeseries-batch-analyze/).

## Input type

Time series, time series group, or transform table

## Output type

Time series

## Examples

![Linear aggregation example](/docs/resources/foundry/quiver/resource-linear-aggregation-example.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported\* |

\* In the transform table, this transform is called "time series group linear aggregation", and must be performed on a time series group column (result of a group by transform).

## See also

* [Linked series aggregation](/docs/foundry/quiver/card-linked-series-aggregation/)
* [Combine time series](/docs/foundry/quiver/card-combine-time-series/)
