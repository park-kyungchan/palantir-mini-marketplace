---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-relative-time-series/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-relative-time-series/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fdf04da759721b80b2ff6ef5c8c121bb9a3e17e60d2e56ab9bf23dbb2de51608"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Relative time"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Relative time

The relative axis plot type can be used to plot series against a time-axis that is not absolute. Instead, you can plot relative to the source plot used.

* In the example below, the relative axis is aligned to the start time of the series. Therefore, the X axis displays days/years since the first time point, instead of the absolute time.
* In addition to aligning to the source plot, you can also align to arbitrary [time ranges](/docs/foundry/quiver/timeseries-ranges/), time series searches, or arbitrary custom dates.

Learn more about [how to use relative time](/docs/foundry/quiver/timeseries-relative-time/).

## Input type

Time series

## Output type

Time series

## Examples

![Relative time example](/docs/resources/foundry/quiver/resource-relative-time-example.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

[Event comparison plot](/docs/foundry/quiver/card-event-comparison-plot/)
