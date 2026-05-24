---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-time-series-numeric-aggregation/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-time-series-numeric-aggregation/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8da8484ae0b6e94ae5cc1d7b927aad8ff4ad1af2ea05668196d4dcbad696b828"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Time series numeric aggregation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time series numeric aggregation

Returns a single number that represents an aggregation of an input numeric time series. To show the units of the series, use the [Time series unit card](/docs/foundry/quiver/card-time-series-unit/). To find the value of a numeric time series at a specific time, use the [Value at time card](/docs/foundry/quiver/card-value-at-time/).

The available aggregations are:

* Sum
* Average
* Standard deviation
* Maximum
* Minimum
* Relative difference
* Difference
* Product
* Count
* First point
* Last point

## Input type

Time series

## Output type

Number

## Examples

![Numeric aggregation example](/docs/resources/foundry/quiver/card-ts-numeric-aggregation.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

* [Rolling aggregate](/docs/foundry/quiver/card-rolling-aggregate/)
* [Value at time](/docs/foundry/quiver/card-value-at-time/)
