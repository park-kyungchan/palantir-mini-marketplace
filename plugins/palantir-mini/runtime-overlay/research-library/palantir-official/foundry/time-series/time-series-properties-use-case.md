---
sourceUrl: "https://www.palantir.com/docs/foundry/time-series/time-series-properties-use-case/"
canonicalUrl: "https://palantir.com/docs/foundry/time-series/time-series-properties-use-case/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d41a0bd25a3c6cbb48d282ab284be9d605bb4b08a0d8eba62c3ecc8e97cc18fb"
product: "foundry"
docsArea: "time-series"
locale: "en"
upstreamTitle: "Documentation | Time series property use case > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time series properties use case

Time series properties on objects enable powerful analytical workflows. This documentation will walk through the various steps to write a pipeline in Pipeline Builder, set up objects in Ontology Manager, and create a Quiver dashboard and Workshop module using an example aviation ontology and the power of time series in Foundry.

The aviation ontology is made up of example `Flight`, `Carrier`, `Route`, `Airport`, and `Flight Sensor` object types. A `Flight` is linked to `Aircraft`, `Flight Sensor`, `Route`, `Airport`, and `Carrier` objects through the `flight_id` foreign key on those objects.

![Flight object links](/docs/resources/foundry/time-series/time-series-properties-flight-ontology.png)

The aviation ontology comes from a reference ontology using open-source data that may not be available for your enrollment. Regardless of the availability for your enrollment, these examples built using this example ontology will serve as a reference as you create your own pipelines, object types, and Workshop modules with time series properties.

The Workshop module that you will produce using the guide will allow you to use and view time series properties on `Carrier`, `Route`, and `Airport` objects using flight data.

![Time series properties Workshop module](/docs/resources/foundry/time-series/time-series-property-workshop.png)

The following guides will lead you through the steps to create and support this Workshop module:

1. [Use Pipeline Builder to generate time series properties from a 'Flight' object set](/docs/foundry/time-series/time-series-properties-use-case-pipeline/)
2. [Add time series properties to aviation objects](/docs/foundry/time-series/time-series-properties-use-case-ontology/)
3. [Use time series properties on aviation objects in Workshop and Quiver](/docs/foundry/time-series/time-series-properties-use-case-operational/)
