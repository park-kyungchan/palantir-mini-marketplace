---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-value-at-time/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-value-at-time/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "542d126d69e7babd3bafcb12f86d2166056497288af288e2677be72529a457af"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Value at time"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Value at time

Returns the value of an input numeric time series at a given input timestamp. If your time series values are strings, you must use the [Enum value at time card](/docs/foundry/quiver/card-enum-value-at-time/). If you would like to return the first or last value of a numeric time series, you should use the [Time series numeric aggregation card](/docs/foundry/quiver/card-time-series-numeric-aggregation/). To show the units of the series, use the [Time series unit card](/docs/foundry/quiver/card-time-series-unit/).

[Learn more about how interpolation affects this operation.](/docs/foundry/quiver/cards-interpolation-usage/#value-at-time)

## Input type

Time series

## Output type

Number

## Examples

![Value at time example](/docs/resources/foundry/quiver/card-value-at-time.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

* [Enum value at time](/docs/foundry/quiver/card-enum-value-at-time/)
* [Latest value for enum time series](/docs/foundry/quiver/card-latest-value-for-enum-time-series/)
* [Time series numeric aggregation](/docs/foundry/quiver/card-time-series-numeric-aggregation/)
* [Time series unit](/docs/foundry/quiver/card-time-series-unit/)
