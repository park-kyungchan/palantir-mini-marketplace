---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-derivative/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-derivative/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "edbe7ae7138bb4cb11291bf618bc52ee9301a7c948f47171aaf8ac93cc8cab52"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Derivative"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Derivative

The Derivative plot shows the rate of change at each given point in the selected input series.

* The default is to calculate the rate of change per second. This can be changed to several other options. Note that this does not affect the shape of the curve, only the y-axis units.
* Derivatives are useful for identifying when the slope of a series is flat (that is, not changing.) To find periods where a series is not changing, you can do a [Time Series Search](/docs/foundry/quiver/card-time-series-search/) for periods when the derivative of the series is close to zero.

## Input type

Time series

## Output type

Time series

### Example

![Derivative example](/docs/resources/foundry/quiver/card-derivative.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
