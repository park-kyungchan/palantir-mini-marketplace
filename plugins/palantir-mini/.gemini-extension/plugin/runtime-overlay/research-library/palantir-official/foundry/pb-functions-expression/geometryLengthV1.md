---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryLengthV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryLengthV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "eafe67369cfe55fab35592789356b9c0a68c78b3799bdbd051a99c96f61cb3e7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometry length"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry length

> Supported in: Batch, Streaming

Get the length of the line strings and multi line strings in the geometry in meters. Uses a spherical approximation of the globe. Non-linear geometries (polygons and points) count as 0.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** GeoJSON string.<br>*Expression\<Geometry>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"LineString","coordinates":\[\[-73.778128,40.641195],\[-118.408535,33.941563]]} | 3974344.7433354934 |
| {"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0],\[1.0,1.0],\[1.0,2.0]]} | 333585.2407005987 |
| {"type":"MultiLineString","coordinates":\[\[\[0.0,0.0],\[1.0,0.0],\[1.0,1.0]], \[\[1.0,2.0],\[2.0,2.0]]]} | 333517.50194413937 |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 3: Edge case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"GeometryCollection","geometries":\[{"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[-3.0,-1.0]... | 333517.50194413937 |
| {"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[-3.0,-1.0],\[-2.0,-2.0],\[-1.0,-1.0]]]} | 0.0 |
| {"type":"MultiPoint","coordinates":\[\[23.0,30.0],\[12.0,15.3]]} | 0.0 |

***
