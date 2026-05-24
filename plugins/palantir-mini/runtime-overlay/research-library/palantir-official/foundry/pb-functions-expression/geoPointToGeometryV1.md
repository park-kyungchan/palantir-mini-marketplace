---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToGeometryV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geoPointToGeometryV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dea8996e87f46e9c4a0de0b902b73b0de4a0ee49fb54c8d7ea57b10b6ba365b0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert GeoPoint to geometry"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert GeoPoint to geometry

> Supported in: Batch, Faster, Streaming

Convert GeoPoint to a GeoJSON of type point.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** A valid GeoPoint.<br>*Expression\<GeoPoint>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geoPoint`

| geoPoint | **Output** |
| ----- | ----- |
| {<br> latitude -> 58.0,<br> longitude -> 32.0,<br>} | {"type":"Point","coordinates": \[32.0, 58.0]} |
| *null* | *null* |
| {<br> latitude -> 40.753206,<br> longitude -> -73.989015,<br>} | {"type":"Point","coordinates": \[-73.989015, 40.753206]} |

***
