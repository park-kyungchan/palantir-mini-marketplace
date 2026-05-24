---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-event-indicator-series/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-event-indicator-series/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e1f3a80850131129072f3729873875f2afc5401075c3c1a80166c7f07ec4f79e"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Event indicator series"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Event indicator series

An event indicator series creates a time series out of an event set indicating the number of events occurring at a given time.

* Note that only events with non-zero durations will be plotted.
* To manually shift the start or end time of the events, use the [time shift event set](/docs/foundry/quiver/card-time-shift-event-set/) card to modify the input event set.

## Input type

Event set

## Output type

Time series

## Examples

![Event indicator series example.](/docs/resources/foundry/quiver/resource-events-series-indicator-example.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
