---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-event-comparison-plot/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-event-comparison-plot/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f8a1990ded88ac72f5c6785ecae13fe81a303270cbc325267c94dfd7120eac7b"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Event comparison plot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Event comparison plot

Compare the behavior of a time series across multiple events by isolating and aligning the segments of the time series where each event is occurring. The plot displays the time series segments in [relative time](/docs/foundry/quiver/timeseries-relative-time/), so that the value at the each event's start time is aligned to zero. The image below shows how the event comparison plot can be used to visualize the behavior of temperature in a tea vat over 80 degrees.

## Input type

Time series + event set

## Output type

Time series group

## Examples

![Event comparison plot example.](/docs/resources/foundry/quiver/resource-event-comparison-plot.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |

## See also

[Reference profile bounds](/docs/foundry/quiver/card-reference-profile-bounds/)
