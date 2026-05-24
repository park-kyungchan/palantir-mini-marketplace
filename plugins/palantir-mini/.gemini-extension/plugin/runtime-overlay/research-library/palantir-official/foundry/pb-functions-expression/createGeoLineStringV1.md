---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/createGeoLineStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/createGeoLineStringV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d127f0fdef482a1605051424eadc8f6fcb6cc62d8612d1661b23071fa729a0ad"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create linestring geometry"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create linestring geometry

> Supported in: Batch, Streaming

Creates a GeoJSON linestring geometry from the given points.

**Expression categories:** Geospatial

## Declared arguments

* **Points:** The points that make up the linestring.<br>*Expression\<Array\<T>>*

**Type variable bounds:** *T accepts Struct\<longitude:Double, latitude:Double>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Points:** `points`

| points | **Output** |
| ----- | ----- |
| \[ {<br> **latitude**: 10.0,<br> **longitude**: 0.0,<br>}, {<br> **latitude**: 10.0,<br> **longitude**: 10.0,<br>} ] | {"type":"LineString","coordinates":\[\[0.0,10.0],\[10.0,10.0]]} |
| \[ {<br> **latitude**: 10.0,<br> **longitude**: 10.0,<br>}, {<br> **latitude**: 20.0,<... | {"type":"LineString","coordinates":\[\[10.0,10.0],\[20.0,20.0],\[30.0,30.0]]} |
| \[ {<br> **latitude**: 0.0,<br> **longitude**: 179.0,<br>}, {<br> **latitude**: 0.0,<br> **longitude**: 181.0,<br>} ] | {"type":"MultiLineString","coordinates":\[\[\[179.0,0.0],\[180.0,0.0]],\[\[-180.0,0.0],\[-179.0,0.0]]]} |
| \[ {<br> **latitude**: 0.0,<br> **longitude**: -179.0,<br>}, {<br> **latitude**: 0.0,<br> **longitude**: -181.0,<br>} ] | {"type":"MultiLineString","coordinates":\[\[\[180.0,0.0],\[179.0,0.0]],\[\[-179.0,0.0],\[-180.0,0.0]]]} |

***

### Example 2: Null case

**Argument values:**

* **Points:** `points`

| points | **Output** |
| ----- | ----- |
| *null* | *null* |
| \[ {<br> **latitude**: 0.0,<br> **longitude**: 0.0,<br>}, *null* ] | *null* |

***

### Example 3: Edge case

**Argument values:**

* **Points:** `points`

| points | **Output** |
| ----- | ----- |
| \[  ] | *null* |
| \[ {<br> **latitude**: 0.0,<br> **longitude**: 0.0,<br>} ] | *null* |

***
