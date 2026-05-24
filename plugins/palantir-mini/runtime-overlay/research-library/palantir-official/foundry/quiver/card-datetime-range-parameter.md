---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-datetime-range-parameter/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-datetime-range-parameter/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cfe9be0f6cd56b7d1e7653686cd118f78e05964bcfc900e79479885377e4b291"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Date/time range parameter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Date/time range parameter

Create a date/time range input field which can be used as a variable in other cards (for example, filters or formulas). There are several input options available in the editor:

* **Fixed range:** Manually select a static start and end date/time for the range.
* **Relative range:** Define the range using durations relative to the current time (for example, from 2 weeks ago to now). The range will update each time the page is loaded.
* **Use variables:** Set the start and end date/times to be defined by distinct date/time variables. For example, if you would like a filter to be based on the start and end time of an event object, you can define separate date/time parameters for each start and end date/times of the event object, then use these date/time parameters to define a time range parameter.

[Learn more about time ranges.](/docs/foundry/quiver/timeseries-ranges/)

## Input type

Flow start

## Output type

Time range

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
