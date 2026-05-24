---
sourceUrl: "https://www.palantir.com/docs/foundry/time-series/geospatial-time-series-use-case-map/"
canonicalUrl: "https://palantir.com/docs/foundry/time-series/geospatial-time-series-use-case-map/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cb3d23fd31a23a4d4b4d6c30fa6b7c8b89203dac5ff7dc44be00882cdafcb0a6"
product: "foundry"
docsArea: "time-series"
locale: "en"
upstreamTitle: "Documentation | Geospatial time series use case > Visualize geospatial time series objects on a map"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Visualize geospatial time series objects on a map

Now that the `Ship` object type has time series properties and geospatial track capabilities configured in [Ontology Manager](/docs/foundry/ontology-manager/overview/), you can visualize ship tracks on a [map](/docs/foundry/map/overview/). The map you create will contain your `Ship` object type's objects as well as their location history as [track geometries](/docs/foundry/map/visualize-tracks/).

## Part I: Add `Ship` objects to a new map

1. Navigate to your project folder and create a new map.
2. Select **Add to map** in the **Layers** tab of the left panel.
3. Search for your `Ship` object type in the search bar or select it from the **Object types** list in the **Objects** panel.
4. Choose to **Add all** objects to your map from the bottom right corner.

![The object search window displays all objects of the Ship object type to add to a Foundry map.](/docs/resources/foundry/time-series/add-object-layers-to-map.png)

Your ship objects with geospatial data will render on the map, displaying their track geometry. Choose an object to launch the **Selection** panel on the right side of your map, where you can [take actions on the object and configure its styling](/docs/foundry/map/selection/#selection-panel).

![A Foundry map's selection panel is displayed.](/docs/resources/foundry/time-series/display-ship-on-map.png)

:::callout{theme="neutral"}
You can learn more about [visualizing tracks](/docs/foundry/map/visualize-tracks/) and [configuring track geometry](/docs/foundry/map/integrate-objects/) in the Map application's existing documentation.
:::

## Part II: Add an object's time series properties to the map's timeline

With a `Ship` object open in the **Series** tab of the **Selection** panel, hover over and select the ellipsis (**...**) icon on the right side of your `Latitude Series` and `Longitude Series` properties and choose **Add to timeline**. This enables you to view your time series properties on your map's [timeline](/docs/foundry/map/time-series/#interact-with-time-series-in-the-timeline-beta).

![The Selection panel on a map displays the ability to add time series properties to the map's timeline.](/docs/resources/foundry/time-series/add-properties-to-timeline.png)

Select, hold, and drag your cursor along the timeline to observe the ship's position update on the map in real time.

![An object moves across a map canvas when dragged in the timeline.](/docs/resources/foundry/time-series/drag-track-geometry-on-map.gif)

[Learn more about interacting with time and temporal data on your map.](/docs/foundry/map/time-overview/)
