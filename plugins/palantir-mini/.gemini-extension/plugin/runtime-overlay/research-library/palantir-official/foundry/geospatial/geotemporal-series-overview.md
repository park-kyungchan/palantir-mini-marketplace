---
sourceUrl: "https://www.palantir.com/docs/foundry/geospatial/geotemporal-series-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/geospatial/geotemporal-series-overview/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "676050e8dd0d1f74c0b80664ae926e08e79a8dd711a84de7967c900314c1bb8c"
product: "foundry"
docsArea: "geospatial"
locale: "en"
upstreamTitle: "Documentation | Geotemporal series > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geotemporal series \[Beta]

:::callout{theme="neutral" title="Beta"}
Geotemporal series are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development.
:::

Geotemporal series data is used to track the geographic position of entities over time. Geotemporal series are conceptually similar to [time series](/docs/foundry/time-series/time-series-overview/) except they include a geospatial component.

Here are some examples of geotemporal series data that you can naturally model:

* The location and time of an aircraft flying between an origin and a destination
* GPS pings emitted every day by birds migrating across North America
* Tracking a package from distribution to delivery

You can use geotemporal series data to operationalize real-time position data on maps or analyze historic data to gain insights into trends over time and space.

## Use geotemporal series data

To use geotemporal series data in Foundry you must set up the following two components:

* **[Geotemporal series object type](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-object-type):** Associates a geotemporal series with metadata and allows Foundry applications to access the series data. For example, you can include the origin and destination airports on the object type alongside the flight path, which is stored as a geotemporal series.
* **[Geotemporal series sync](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-sync-gtss):** A resource backed by a dataset or stream that indexes geotemporal series data into an optimized database and provides values for [geotemporal series references](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-reference-gtsr). You can configure geotemporal series syncs using [Pipeline Builder](/docs/foundry/pipeline-builder/outputs-overview/#geotemporal-series-syncs).

![An overview diagram of the geotemporal series process.](/docs/resources/foundry/geospatial/overview.png)

Learn more about [how to store geotemporal series in the Ontology](/docs/foundry/geospatial/integrate-geotemporal-series-with-the-ontology/).
