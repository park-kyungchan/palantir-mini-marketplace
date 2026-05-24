---
sourceUrl: "https://www.palantir.com/docs/foundry/map/visualize-polygons-lines/"
canonicalUrl: "https://palantir.com/docs/foundry/map/visualize-polygons-lines/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6f5c8a2a6176c97d7794c0305963f061c45eb4223fdc02ea9ca3b2972e15fc75"
product: "foundry"
docsArea: "map"
locale: "en"
upstreamTitle: "Documentation | Visualize Ontology data > Lines and polygons"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Polygon and line displays

Maps can render polygons and lines based on your ontology objects. There are two ways to specify the line or polygon geometry to draw:

* **Geoshape properties:** Display GeoJSON line and polygon geometries stored in a geoshape property on your objects.
* **Line segment:** Display lines between two geopoint properties on objects.

See [value-based styling](/docs/foundry/map/visualize-objects/#value-based-styling) for more information on how styling rules are configured, as well as color and opacity styling configuration. Polygons and lines can be styled with the following additional attributes.

## Stroke width

Use the **Stroke width** section to control the width used when rendering lines, or the stroke of polygons that are not filled.

![Styling line width.](/docs/resources/foundry/map/styling-line-width.png)

## Stroke style

Use the **Stroke style** section to control the dash pattern used when rendering lines, or the stroke of polygons that are not filled. The available options are:

| Solid                                           | Dashed                                            | Dotted                                            |
| ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| ![Solid line.](/docs/resources/foundry/map/styling-stroke-solid.png) | ![Dashed line.](/docs/resources/foundry/map/styling-stroke-dashed.png) | ![Dotted line.](/docs/resources/foundry/map/styling-stroke-dotted.png) |

For line segments, you can also configure arrows to indicate the direction of the line.

![Line segment with arrows.](/docs/resources/foundry/map/styling-arrows.png)

## Fill polygons

When **Fill polygons** is enabled, polygons render with a minimal stroke and their interior filled with the specified color. When disabled, the polygon is instead only stroked, using the styling configuration in **Stroke width** and **Stroke style**.

| Fill enabled                                        | Fill disabled                                         |
| --------------------------------------------------- | ----------------------------------------------------- |
| ![Filled polygon.](/docs/resources/foundry/map/styling-fill-enabled.png) | ![Stroked polygon.](/docs/resources/foundry/map/styling-fill-disabled.png) |

## Loading methods

When displaying a large number of objects, polygon and line geometries can also support tile-based [loading methods](/docs/foundry/map/objects-loading-methods/).
