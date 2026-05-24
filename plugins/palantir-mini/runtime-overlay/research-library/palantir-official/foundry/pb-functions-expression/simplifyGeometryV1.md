---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/simplifyGeometryV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/simplifyGeometryV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6590fd690a44400c719fa3f1ec984ae449d2e047ea5961d0d822c1da03990351"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Simplify geometry"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Simplify geometry

> Supported in: Batch, Faster, Streaming

This expression simplifies GeoJSON geometry by removing points within the given tolerance distance using a spherical model of the globe. Loops smaller than the tolerance may be removed entirely.

**Expression categories:** Geospatial

## Declared arguments

* **Geometry:** Valid GeoJSON geometry.<br>*Expression\<Geometry>*
* **Tolerance:** Tolerance (meters).<br>*Expression\<Long>*
* *optional* **Coordinate precision:** Maximum number of decimal places for coordinates (defaults to 6 decimal places).<br>*Expression\<Long>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Geometry:** `Geometry`
* **Tolerance:** `Tolerance`
* **Coordinate precision:** *null*

| Geometry | Tolerance | **Output** |
| ----- | ----- | ----- |
| {"type":"LineString","coordinates":\[\[30.0,0.0],\[35.0,0.0],\[40.0,0.0]]} | 1000 | {"type":"LineString","coordinates":\[\[30.0,0.0],\[40.0,0.0]]} |
| {"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[0.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]]} | 12000 | {"type":"Polygon","coordinates":\[\[\[-1.0,1.0],\[1.0,1.0],\[1.0,-1.0],\[-1.0,-1.0],\[-1.0,1.0]]]} |
| {"type":"MultiLineString","coordinates":\[\[\[0.0,0.0],\[5.0,0.1],\[10.0,0.0]], \[\[0.0,-5.0],\[5.0,0.1],\[10.0,5.0]]]} | 12000 | {"type":"MultiLineString","coordinates":\[\[\[0.0,0.0],\[10.0,0.0]],\[\[0.0,-5.0],\[10.0,5.0]]]} |
| {"type":"MultiPolygon","coordinates":\[\[\[\[-2.0,-2.0],\[2.0,-2.0],\[2.0,2.0],\[0.0,2.1],\[-2.0,2.0],\[-2.0,... | 12000 | {"type":"MultiPolygon","coordinates":\[\[\[\[-2.0,2.0],\[2.0,2.0],\[2.0,-2.0],\[-2.0,-2.0],\[-2.0,2.0]], \[\[1... |

***

### Example 2: Base case

**Argument values:**

* **Geometry:** `Geometry`
* **Tolerance:** `Tolerance`
* **Coordinate precision:** `Coordinate precision`

| Geometry | Tolerance | Coordinate precision | **Output** |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[-1.012345,-1.0],\[1.012345,-1.0],\[1.012345,1.0],\[0.0,1.0],\[-1.012345,1.0],\[-1.012345,-1.0]]]} | 12000 | 3 | {"type":"Polygon","coordinates":\[\[\[-1.012,1.0],\[1.012,1.0],\[1.012,-1.0],\[-1.012,-1.0],\[-1.012,1.0]]]} |
| {"type":"Polygon","coordinates":\[\[\[-1.0123456789,-1.0],\[1.0123456789,-1.0],\[1.0123456789,1.0],\[0.0,1.0],\[-1.0123456789,1.0],\[-1.0123456789,-1.0]]]} | 12000 | 6 | {"type":"Polygon","coordinates":\[\[\[-1.012346,1.0],\[1.012346,1.0],\[1.012346,-1.0],\[-1.012346,-1.0],\[-1.012346,1.0]]]} |
| {"type":"Polygon","coordinates":\[\[\[-1.0123456789,-1.0],\[1.0123456789,-1.0],\[1.0123456789,1.0],\[0.0,1.0],\[-1.0123456789,1.0],\[-1.0123456789,-1.0]]]} | 12000 | 10 | {"type":"Polygon","coordinates":\[\[\[-1.0123456789,1.0],\[1.0123456789,1.0],\[1.0123456789,-1.0],\[-1.0123456789,-1.0],\[-1.0123456789,1.0]]]} |

***

### Example 3: Null case

**Argument values:**

* **Geometry:** `Geometry`
* **Tolerance:** `Tolerance`
* **Coordinate precision:** *null*

| Geometry | Tolerance | **Output** |
| ----- | ----- | ----- |
| *null* | 0 | *null* |

***

### Example 4: Edge case

**Argument values:**

* **Geometry:** `Geometry`
* **Tolerance:** `Tolerance`
* **Coordinate precision:** `Coordinate precision`

| Geometry | Tolerance | Coordinate precision | **Output** |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[0.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]]} | 200000 | 3 | *null* |
| {"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[0.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]],\[\[5.0,0.0],\[10.0,0.0],\[10.0,5.0],\[5.0,5.0],\[5.0,0.0]]]} | 200000 | 3 | {"type":"Polygon","coordinates":\[\[\[10.0, 5.0], \[10.0, 0.0], \[5.0, 0.0], \[5.0, 5.0], \[10.0, 5.0]]]} |
| {"type":"MultiPolygon","coordinates":\[\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[0.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]],\[\[\[5.0,0.0],\[10.0,0.0],\[10.0,5.0],\[5.0,5.0],\[5.0,0.0]]]]} | 200000 | 3 | {"coordinates":\[\[\[10.0, 5.0], \[10.0, 0.0], \[5.0, 0.0], \[5.0, 5.0], \[10.0, 5.0]]], "type":"Polygon"} |
| {"type":"MultiPolygon","coordinates":\[\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[0.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]],\[\[\[5.0,0.0],\[10.0,0.0],\[10.0,5.0],\[5.0,5.0],\[5.0,0.0]]]]} | 500000 | 3 | *null* |
| {"type":"GeometryCollection","geometries":\[{"type":"MultiLineString","coordinates":\[\[\[0.0,0.0],\[5.0,... | 500000 | 3 | {"type":"GeometryCollection","geometries":\[{"type":"MultiLineString","coordinates":\[\[\[0.0, 0.0], \[10.0, 0.0]], \[\[0.0, -5.0],\[10.0, 5.0]]]}]} |
| {"type":"GeometryCollection","geometries":\[{"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[1.0,-1.0],... | 500000 | 3 | *null* |

***
