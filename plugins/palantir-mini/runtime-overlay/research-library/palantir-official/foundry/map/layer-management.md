---
sourceUrl: "https://www.palantir.com/docs/foundry/map/layer-management/"
canonicalUrl: "https://palantir.com/docs/foundry/map/layer-management/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1cff46e48170a479971a915ac87229417b6245faa8924b024a86157dede58cab"
product: "foundry"
docsArea: "map"
locale: "en"
upstreamTitle: "Documentation | Interact with maps > Layer management"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Layer management

All data on your map is grouped into different [types of layers](/docs/foundry/map/core-concepts/), which can be managed in the **Layers** panel.

## Toggle layer visibility

Show or hide the contents of a layer by using the visibility toggle:

<img src="./media/layer-management-hide-layer.png" alt="Hide layer button" />

## Rename layers

Edit a layer's name by clicking on the current name.

<img src="./media/layer-management-edit-layer-name.png" alt="Edit layer name" />

## Reorder layers

Change the order of layers by dragging the layer's icon. Reordering layers can alter the rendering of your map, as layers that appear higher in the list of layers render on top of layers that appear lower in the list.

![Layer ordering and rendering with weather layer on top of snotel layer](/docs/resources/foundry/map/layer-management-ordering-weather-first.png)

![Layer ordering and rendering with snotel layer on top of weather layer](/docs/resources/foundry/map/layer-management-ordering-snotel-first.png)

## Move objects to new or existing layers

Objects can be spread into multiple layers, as long as the contents are all of the same object type. After moving a selected set into a new layer, the objects in each set can be styled differently, as demonstrated in the images below.

![Creating a new layer with selected set of weather station objects](/docs/resources/foundry/map/layer-management-move-to-new-layer.png)

![Moving weather station objects to an existing layer](/docs/resources/foundry/map/layer-management-move-to-layer.png)
