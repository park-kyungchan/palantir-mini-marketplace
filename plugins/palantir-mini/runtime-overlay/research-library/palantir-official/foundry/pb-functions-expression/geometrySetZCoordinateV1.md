---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometrySetZCoordinateV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometrySetZCoordinateV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "84d7e7d1ad31f87aa01eb120000f88236d9f27e4df01d44f984db3b32f6693e7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometry set z-coordinate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry set z-coordinate

> Supported in: Batch, Faster, Streaming

Sets the z-coordinate of a geometry. If the geometry has an existing z-coordinate it will be overwritten.

**Expression categories:** Geospatial

## Declared arguments

* **Geometry:** Geometry.<br>*Expression\<Geometry>*
* **Z coordinate:** Z-coordinate.<br>*Expression\<Double>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Geometry:** `geometry`
* **Z coordinate:** `zCoordinate`

| geometry | zCoordinate | **Output** |
| ----- | ----- | ----- |
| {"type":"Point","coordinates":\[1.0, 2.0]} | 1.0 | {"type":"Point","coordinates":\[1.0, 2.0, 1.0]} |
| {"type":"Point","coordinates":\[1.0, 2.0, 3.0]} | 1.0 | {"type":"Point","coordinates":\[1.0, 2.0, 1.0]} |

***

### Example 2: Null case

**Argument values:**

* **Geometry:** `geometry`
* **Z coordinate:** `zCoordinate`

| geometry | zCoordinate | **Output** |
| ----- | ----- | ----- |
| *null* | 0.0 | *null* |
| {"type":"Point","coordinates":\[1.0, 2.0]} | *null* | {"type":"Point","coordinates":\[1.0, 2.0]} |

***
