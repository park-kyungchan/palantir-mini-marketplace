---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-map/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-map/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4572222db0704c8b1d1d5838d938cc07c22833af4e61b65adc4f46bb5d73557f"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Map"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Map

Visualize one or more object sets on a map. Maps are backed by geospatial data (geopoints, GeoJSON, and region codes) that can be charted in a variety of ways. You can find a detailed description of map layer configurations in the [Workshop map widget documentation](/docs/foundry/workshop/widgets-map/).

* Point layers plot each object at a specific location on the map.
* Clusters take a group of points and dynamically combine them based on zoom level.
* Choropleth layers can aggregate an entire region to plot shaded areas of the map.
* Line segments are used to connect multiple points using a collection of straight lines.

## Input type

Object set

## Output type

Object selection

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
