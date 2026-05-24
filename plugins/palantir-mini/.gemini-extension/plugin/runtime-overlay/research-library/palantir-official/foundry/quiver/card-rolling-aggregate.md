---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-rolling-aggregate/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-rolling-aggregate/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b7dad111f5200a223e00f5cfbd827912fad8bb50f4972676eefe3a536a15daa7"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Rolling aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Rolling aggregate

Rolling aggregates are typically used to “smooth” a series and show an averaged version of it. For each point in your series, a Rolling aggregate will calculate a new point based on your window function and aggregate method.

* As an example, if you choose a window size of one week and method `average`, each point will be calculated by finding the average value over the previous week.
* If you choose a window size of three days and method `sum`, then each point will be the sum of the previous three days.
* Windows are calculated by previous values up to and including that point.

## Input type

Time series

## Output type

Time series

### Example

![Rolling aggregate example](/docs/resources/foundry/quiver/card-rolling-aggregate.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
