---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-linked-event-set/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-linked-event-set/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "33ae83282c1e61d26111a648d5e7ea51782780a1bbdc990d8174bee734ef80af"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Linked event set"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Linked event set

Create an event set by starting from a base object and finding related objects through Ontology-defined links (also referred to as a [search around](/docs/foundry/quiver/objects-import-linked/)). Multiple layers of object relations can be traversed to build an event set of the desired type, and then the event set can optionally be filtered. Set the start and end timestamps for the events by specifying which object properties hold this data in the **Events configuration** settings in the **Data** tab of the editor panel. A linked event set can also be created from a starting time series. In this case, the [root object](/docs/foundry/time-series/time-series-concepts-glossary/#sensor-object-type) of the time series will be used as the base object. Linked event sets are object-based, so the event tooltips are populated using data from each object.

## Input type

Object or time series

## Output type

Event set

## Examples

![Linked event set example.](/docs/resources/foundry/quiver/resource-event-set-linked.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
