---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryCentroidV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryCentroidV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8e26283d4332da4d6e699309900bd9df6fb03e9605707076925d62d9ad1fedd6"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometry centroid"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry centroid

> Supported in: Batch, Streaming

Return the centroid, or "center of mass", of the geometry using a spherical approximation of the globe. If the geometry is a collection of mixed dimensions, only the elements of the highest dimension will contribute to the centroid (e.g. in a collection of points, lines and polygons, points and lines are ignored). This operation will round to 32-bit floating point precision for coordinates in the geometry.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** Valid GeoJSON input.<br>*Expression\<Geometry>*

**Output type:** *GeoPoint*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[-1.0,-1.0],\[1.0,-1.0],\[1.0,1.0],\[-1.0,1.0],\[-1.0,-1.0]]]} | {<br> **latitude**: 0.0,<br> **longitude**: 0.0,<br>} |
| {"type":"LineString","coordinates":\[\[30.0,0.0],\[35.0,0.0],\[50.0,0.0]]} | {<br> **latitude**: 0.0,<br> **longitude**: 40.0,<br>} |
| {"type":"MultiPoint","coordinates":\[\[0.0,0.0],\[0.0,1.0]]} | {<br> **latitude**: 0.5,<br> **longitude**: 0.0,<br>} |
| {"type":"MultiPoint","coordinates":\[\[160.0,0.0],\[-170.0,0.0]]} | {<br> **latitude**: 0.0,<br> **longitude**: 175.0,<br>} |
| {"type":"GeometryCollection","geometries":\[{"type":"Polygon","coordinates":\[\[\[0.0,-0.017981],\[0.0017... | {<br> **latitude**: 0.0,<br> **longitude**: 0.0,<br>} |
| {"type":"Polygon","coordinates":\[\[\[10.2010565854362,-45.0511905886321],\[10.20108119607644,-45.051242... | {<br> **latitude**: -45.05131203645637,<br> **longitude**: 10.200951037517806,<br>} |
| *null* | *null* |

***
