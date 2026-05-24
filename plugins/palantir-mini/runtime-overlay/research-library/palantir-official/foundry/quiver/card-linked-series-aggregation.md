---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-linked-series-aggregation/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-linked-series-aggregation/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "446171426802215b938f158a2fc95baf83268f08d3e96ea9f41282f15b655394"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Linked series aggregation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Linked series aggregation

Generates a new time series by performing a linear aggregation on time series data from linked objects. Start from a single object, search around to linked objects, and aggregate series of a given type on these objects.

## Event options

Event options can be configured to search for event objects and align the time series relative to the event start time. Starting from the same object, search around to event objects, define the start and end time properties, and provide a common key between the time series and event objects. The resulting time series objects and event objects will be inner joined on the common key, and the time series will be filtered to the event start and end times and aligned relative to the event start time before being aggregated. The resulting time series will be in relative time.

## Input type

Object

## Output type

Time series

### Example

Without event options:

![Linked series aggregation](/docs/resources/foundry/quiver/card-linked-series-aggregation.png)

With event options:

![Linked series aggregation aligned to events](/docs/resources/foundry/quiver/card-linked-series-aggregation-with-event-options.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |

## See also

[Linear aggregation](/docs/foundry/quiver/card-linear-aggregation/)

[Reference profiles in derived series](/docs/foundry/quiver/timeseries-reference-profiles/#reference-profiles-in-derived-series)
