---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-periodic-aggregate/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-periodic-aggregate/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "528cf589cbd97a97bb9eebefdc3e5f4965d8901ed51e7a75ea2e009b5bc1b576"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Periodic aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Periodic aggregate

Periodic aggregates are similar to Rolling aggregates except that they downsample the data.

* If you have daily data and perform a Rolling aggregate using a window of one week with an average function, your chart will return a series with one point per day, with each point representing the previous week’s average.
* However, if you do a Periodic aggregate with a window of one week, your new series will have one point per week rather than one point per day.

## Input type

Time series

## Output type

Time series

## Examples

![Periodic aggregate example](/docs/resources/foundry/quiver/card-periodic-aggregate.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

[Rolling aggregate](/docs/foundry/quiver/card-rolling-aggregate/)
