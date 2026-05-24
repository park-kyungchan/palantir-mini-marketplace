---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/linestringToPolygonV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/linestringToPolygonV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "de7b6655db71333ab3395ce07b9ad7e61d13bfbde18fac52fd1161c1959b1a82"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert linestring to polygon"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert linestring to polygon

> Supported in: Batch, Faster, Streaming

Convert a linestring geometry to a polygon geometry. This expression assumes the linestring geometry is closed. If not, the expression will return null.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** A valid linestring geometry.<br>*Expression\<Geometry>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `polygon_points`

| polygon\_points | **Output** |
| ----- | ----- |
| {"type":"LineString","coordinates":\[\[-77.49,38.01],\[-77.47,38.15],\[-77.19,38.14],\[-77.49,38.01]]} | {"type":"Polygon","coordinates":\[\[\[-77.49,38.01],\[-77.47,38.15],\[-77.19,38.14],\[-77.49,38.01]]]} |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `polygon_points`

| polygon\_points | **Output** |
| ----- | ----- |
| *null* | *null* |
| {"type":"LineString","coordinates":\[\[-77.49,38.01],\[-77.19,38.14],\[-77.49,38.01]]} | *null* |
| {"type":"LineString","coordinates":\[\[-77.49,38.01],\[-77.19,38.14]]} | *null* |
| {"type":"LineString","coordinates":\[\[-77.49,38.01]]} | *null* |
| {"type":"Polygon","coordinates":\[\[\[-77.49,38.01],\[-77.47,38.15],\[-77.19,38.14],\[-77.49,38.01]]]} | *null* |

***
