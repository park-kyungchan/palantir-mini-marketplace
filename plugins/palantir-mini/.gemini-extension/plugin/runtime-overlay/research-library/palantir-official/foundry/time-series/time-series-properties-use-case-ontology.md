---
sourceUrl: "https://www.palantir.com/docs/foundry/time-series/time-series-properties-use-case-ontology/"
canonicalUrl: "https://palantir.com/docs/foundry/time-series/time-series-properties-use-case-ontology/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9d27d566197185eef68eb55fa47b3d9f1276052ad059a64f43e5cfac577fafa5"
product: "foundry"
docsArea: "time-series"
locale: "en"
upstreamTitle: "Documentation | Time series property use case > Add time series properties to objects with Ontology Manager"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add time series properties to objects with Ontology Manager

This guidance references the documentation for [setting up a time series property on a time series object type](/docs/foundry/time-series/time-series-properties/). You can add as many time series properties to the object type as necessary, with the assumption that a time series set will always be associated with each object. Review our documentation to understand whether to choose a [time series object type or a sensor object type](/docs/foundry/time-series/time-series-overview/#store-time-series-in-the-ontology).

You must repeat the steps below for both the `Route` and `Airport` object types. At the end of this guide, the `Carrier`, `Route`,  and `Airport` object types will each have three time series properties for `Daily Count of Flights`, `Daily Average Arrival Delay` and `Daily Average Departure Delay`.

1. Navigate to the `Carrier` object type in Ontology Manager and select the **Capabilities** tab.
2. From the **Time series property** section select **+ Add**.

![Add a time series property to an object in Ontology Manager](/docs/resources/foundry/time-series/time-series-properties-om-add-tsp.png)

3. Select the existing `Daily Count of Flights` property as the time series property, then select **Set as default time series property** so that it automatically appears in Quiver.

![Select daily count of flights property and set as default TSP](/docs/resources/foundry/time-series/time-series-properties-om-select-sync-and-default.png)

4. Select the time series sync that you created [in Pipeline Builder](/docs/foundry/time-series/time-series-properties-use-case-pipeline/). In our example, it is called `[Example] Time Series Sync | Event Pipeline`.

![Select the time series sync for the time series property](/docs/resources/foundry/time-series/time-series-properties-om-add-sync.png)

5. Repeat this process for the `Daily Average Arrival Delay` and `Daily Average Departure Delay` time series properties.

Now that the time series properties have been added to the object types, we are ready to use the time series properties in an operational context. Proceed in the documentation to learn how to [use time series properties on objects in Workshop and Quiver](/docs/foundry/time-series/time-series-properties-use-case-operational/)
