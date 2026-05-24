---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/perimeterV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/perimeterV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6c9e12829eca79fc81f8d3b375454829aa135f7fa6760a3dfcce53056591e8cd"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Perimeter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Perimeter

> Supported in: Batch, Streaming

Calculates perimeter of a geometry in meters using a spherical approximation of the globe. For a line string or a point, this equals 0.

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
| {"type":"Polygon","coordinates":\[\[\[-102.05,41.0],\[-109.05,41.0],\[-109.05,37.0],\[-102.05,37.0],\[-102.05,41.0]]]} | 2098333.448556529 |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"MultiPolygon","coordinates":\[\[\[\[-102.05,41.0],\[-109.05,41.0],\[-109.05,37.0],\[-102.05,37.0],\[-102.05,41.0]]],\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]]]} | 2987826.341349821 |

***

### Example 3: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]]} | 889492.8927932923 |

***

### Example 4: Null case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 5: Edge case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| not geoJson | *null* |

***

### Example 6: Edge case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0]]} | 0.0 |

***

### Example 7: Edge case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Point","coordinates":\[0.0,0.0]} | 0.0 |

***

### Example 8: Edge case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[-179.0,-1.0],\[179.0,-1.0],\[179.0,1.0],\[-179.0,1.0],\[-179.0,-1.0]]]} | 889492.8927932923 |

***
