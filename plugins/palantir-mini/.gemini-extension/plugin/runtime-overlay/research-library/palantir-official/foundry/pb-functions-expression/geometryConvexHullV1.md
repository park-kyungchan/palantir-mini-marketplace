---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryConvexHullV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryConvexHullV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "282abd4cf63e5bcd5e2c42aa7d1e0ee6c5956f9282a1a8081472ec40afbd84a1"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Get the convex hull of a geometry"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get the convex hull of a geometry

> Supported in: Batch, Faster, Streaming

Given a valid GeoJSON input string, return a GeoJSON string that is the convex hull for the geometry. The convex hull is the smallest convex polygon containing the geometry.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** GeoJSON values for which the convex hull is calculated.<br>*Expression\<Geometry>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[2.0,0.0],\[2.0,1.0],\[1.0,1.0],\[1.0,2.0],\[0.0,2.0],\[0.0,0.0]]]} | {"type":"Polygon", "coordinates":\[\[\[0.0, 0.0], \[0.0, 2.0], \[1.0, 2.0], \[2.0, 1.0], \[2.0, 0.0], \[0.0, 0.0]]]} |
| *null* | *null* |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[1.0,0.0],\[0.0,1.0],\[0.0,0.0]]]} | {"type":"Polygon","coordinates":\[\[\[0.0, 0.0], \[0.0, 1.0], \[1.0, 0.0], \[0.0, 0.0]]]} |

***

### Example 3: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"MultiPolygon","coordinates":\[\[\[\[0.0,0.0],\[1.0,0.0],\[1.0,1.0],\[0.0,1.0],\[0.0,0.0]]],\[\[\[2.0,0.0],\[3.0,0.0],\[3.0,1.0],\[2.0,1.0],\[2.0,0.0]]]]} | {"type":"Polygon", "coordinates":\[\[\[0.0, 0.0], \[0.0, 1.0], \[3.0, 1.0], \[3.0, 0.0],\[0.0, 0.0]]]} |

***

### Example 4: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"MultiPoint","coordinates":\[\[0.0,0.0],\[0.0,1.0],\[2.0,0.0], \[2.0,1.0]]} | {"type":"Polygon","coordinates":\[\[\[0.0, 0.0], \[0.0, 1.0], \[2.0, 1.0], \[2.0, 0.0], \[0.0, 0.0]]]} |

***
