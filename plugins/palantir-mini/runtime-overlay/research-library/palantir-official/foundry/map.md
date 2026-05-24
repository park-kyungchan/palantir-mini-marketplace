---
sourceUrl: "https://www.palantir.com/docs/foundry/map/"
canonicalUrl: "https://palantir.com/docs/foundry/map/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "80c0211275b0386ef45cd34c9cdff286600a5ea2d3cfa248e599e436daaee870"
product: "foundry"
docsArea: "map"
locale: "en"
upstreamTitle: "Documentation | Map > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Map

The **Map** application provides powerful geospatial and temporal analysis and visualization capabilities, allowing you to integrate data from across Foundry into a cohesive geospatial experience:

* Explore connections between geospatial objects, traverse physical networks.
* Search geospatially for point and polygon data, using bounding box and polygon intersection queries.
* Visualize contextual geospatial data from a variety of sources, including high-scale vector data and satellite imagery, and temporal data such as paths of object movements over time, and events.
* Interact by drawing shapes and performing geospatial actions.
* Build geospatial applications using map templates.

![Map Application](/docs/resources/foundry/map/map-overview.png)

## Geospatial data on the Map

The Map application renders maps using the [Web Mercator Projection ↗](https://en.wikipedia.org/wiki/Web_Mercator_projection) (EPSG:3857), and expects latitude/longitude coordinates in WGS 84 degrees (EPSG:4326). See [Geospatial data in Foundry](/docs/foundry/geospatial/overview/) for more information on transforming geospatial data in Foundry.
