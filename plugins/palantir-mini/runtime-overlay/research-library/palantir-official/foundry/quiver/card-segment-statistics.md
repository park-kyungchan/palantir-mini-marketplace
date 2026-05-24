---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-segment-statistics/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-segment-statistics/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7688879f2e310a95d6d7e90353516c77725eeb14a66f0a6b847849fbd4acd41b"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Segment statistics [Sunset]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Segment statistics

Segment statistics operate on the output of a [filtered](/docs/foundry/quiver/card-filter-time-series/) series.

* Filtered series will often be shown as discrete segments, with gaps in between each segment. The Segment statistics allows you to calculate statistics about each segment (such as average, max, or standard deviation).

:::callout{theme="warning" title="Sunset"}
The segment statistics card is in the [sunset phase of development](/docs/foundry/platform-overview/development-life-cycle/) and is no longer being updated. We recommend using the [event statistics card](/docs/foundry/quiver/card-event-statistics/) instead.
:::

## Input type

Time series

## Output type

Time series

## Examples

![Segment statistics example](/docs/resources/foundry/quiver/card-segment-statistics.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
