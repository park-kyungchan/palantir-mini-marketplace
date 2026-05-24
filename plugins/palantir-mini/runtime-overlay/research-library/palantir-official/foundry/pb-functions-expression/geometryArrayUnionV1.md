---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryArrayUnionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryArrayUnionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9485afbd6cb37d21ac404bd131d6da8d57729a0c79c2e6950556ee4790881180"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometry array (unary) union"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry array (unary) union

> Supported in: Batch, Faster, Streaming

Given an array of geometries, combine these into a single geometry, merging without overlap.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** An array of geometries to union.<br>*Expression\<Array\<T>>*

**Type variable bounds:** *T accepts Geometry*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]}, {"type":"Polygon","coordinates":\[\[\[0.5,0.0],\[1.5,0.0],\[1.5,1.0],\[0.5,1.0],\[0.5,0.0]]]} ] | {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[0.5,1.0],\[1.0,1.0],\[1.5,1.0],\[1.5,0.0],\[1.0,0.0],\[0.5,0.0],\[0.0,0.0]]]} |
| \[  ] | *null* |
| *null* | *null* |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]}, {"type":"P... | {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} |

***

### Example 3: Base case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]}, {"type":"Polygon","coordinates":\[\[\[5.0,5.0],\[5.0,6.0],\[6.0,6.0],\[6.0,5.0],\[5.0,5.0]]]} ] | {"type":"MultiPolygon","coordinates":\[\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]],\[\[\[5.0,5.0],\[5.0,6.0],\[6.0,6.0],\[6.0,5.0],\[5.0,5.0]]]]} |

***

### Example 4: Base case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]}, {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} ] | {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0],\[0.0,0.0]]]} |

***

### Example 5: Base case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0]]}, {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} ] | {"type":"GeometryCollection","geometries":\[{"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0]]},{"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]}]} |

***

### Example 6: Edge case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]}, {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} ] | {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} |

***

### Example 7: Edge case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} ] | {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} |

***

### Example 8: Edge case

**Argument values:**

* **Expression:** `geometries`

| geometries | **Output** |
| ----- | ----- |
| \[ {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]}, {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0]]]} ] | {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} |

***
