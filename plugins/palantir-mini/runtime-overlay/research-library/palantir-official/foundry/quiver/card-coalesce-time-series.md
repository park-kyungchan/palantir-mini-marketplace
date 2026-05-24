---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-coalesce-time-series/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-coalesce-time-series/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ee4fe543a2713b9ad5dac68f5ca452c15ec4684a7e4dc4aada7dc75d93438a59"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Coalesce time series"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Coalesce time series

The coalesce time series card returns the first time series that is not null or errored, or null if all input series are null. This card is useful for casting potential null series to a defined series. To do this, use a variable input to select a card or column value that is potentially null as the first array value. For the second array value, choose a non-null "fallback" time series for cases when the first value is null.

## Input type

Time series array

## Output type

Time series

## Examples

![Coalesce time series example](/docs/resources/foundry/quiver/card-coalesce-ts.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

* [Coalesce](/docs/foundry/quiver/card-coalesce/)
