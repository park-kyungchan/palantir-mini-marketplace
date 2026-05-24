---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-bar-chart/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-bar-chart/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "901e511b47062773fb3508968c1652dce19b0aacade63a079558090dc6408d4d"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Bar chart"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Bar chart

Create a horizontal or vertically oriented bar chart of your objects. Bar chart categories are determined by your object properties, and you can set values to count objects or show an aggregation of a property value or values. You can also use a bar chart to convert data into a time series.

* Supported aggregation metrics: min, max, sum, average, count, unique count, percentile, standard deviation, and variance
* Percentile, standard deviation, and variance metrics are not supported for object types backed by [Object Storage V1 (Phonograph)](/docs/foundry/object-backend/overview/#object-databases).

## Input type

Object set

## Output type

Categorical chart, object selection

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |

## See also

[Line chart](/docs/foundry/quiver/card-line-chart/)
[Pie chart](/docs/foundry/quiver/card-pie-chart/)
[Categorical scatter plot](/docs/foundry/quiver/card-categorical-scatter-plot/)
