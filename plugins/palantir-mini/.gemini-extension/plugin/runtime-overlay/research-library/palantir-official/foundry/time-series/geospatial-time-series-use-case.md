---
sourceUrl: "https://www.palantir.com/docs/foundry/time-series/geospatial-time-series-use-case/"
canonicalUrl: "https://palantir.com/docs/foundry/time-series/geospatial-time-series-use-case/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5636cd01982bd342af21f84a5570dd1992cb212aea6b5665b94c6f2129950508"
product: "foundry"
docsArea: "time-series"
locale: "en"
upstreamTitle: "Documentation | Geospatial time series use case > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geospatial time series use case

Geospatial time series properties on objects enable you to track the location of entities over time. Review the [geospatial documentation](/docs/foundry/geospatial/faq/#when-should-i-use-geotemporal-series-instead-of-time-series-to-display-geospatial-data) to decide if a [geotemporal series](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series) or time series set up is right for your use case.

This documentation walks you through the steps to prepare time series data in Pipeline Builder, configure objects in Ontology Manager, and visualize entity tracks on a [map](/docs/foundry/map/overview/) using an example `Ship` object type. The `Ship` object type has two backing datasets containing information about each individual ship, such as its `Ship Id`, and location updates over time expressed as latitude and longitude values with timestamps.

![A notional Ship object type and its backing datasets are displayed.](/docs/resources/foundry/time-series/geospatial-use-case-object-type-overview.png)

The following guides will lead you through the steps to create objects with geospatial time series data and visualize them on a [map](/docs/foundry/map/overview/):

1. [Use Pipeline Builder to prepare time series and object backing data](/docs/foundry/time-series/geospatial-time-series-pipeline/)
2. [Add time series properties and configure geospatial capabilities with Ontology Manager](/docs/foundry/time-series/geospatial-time-series-ontology/)
3. [Visualize a ship's tracks on a map](/docs/foundry/time-series/geospatial-time-series-use-case-map/)
