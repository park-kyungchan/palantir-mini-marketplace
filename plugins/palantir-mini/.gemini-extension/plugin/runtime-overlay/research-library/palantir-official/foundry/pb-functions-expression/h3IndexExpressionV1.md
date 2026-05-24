---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/h3IndexExpressionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/h3IndexExpressionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6a3f04f428cf5c1add81dec9e6489ed2628f3ebfb4ecae6e737d72ded82eddb0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Get H3 index"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get H3 index

> Supported in: Batch, Faster, Streaming

Convert GeoPoint to H3 index at given resolution. Returns null for resolution <0 or >15.

**Expression categories:** Geospatial

## Declared arguments

* **GeoPoint:** GeoPoint (lon,lat) to convert to H3 index.<br>*Expression\<GeoPoint>*
* **Resolution:** H3 grid resolution between 0 and 15 (inclusive).<br>*Expression\<Byte | Integer | Long | Short>*

**Output type:** *H3 Index*

## Examples

### Example 1: Base case

**Argument values:**

* **GeoPoint:** `point`
* **Resolution:** 5

| point | **Output** |
| ----- | ----- |
| {<br> **latitude**: -20.0,<br> **longitude**: 80.0,<br>} | 85aa614bfffffff |
| {<br> **latitude**: 38.9031,<br> **longitude**: -77.0599,<br>} | 852aa84ffffffff |

***

### Example 2: Base case

**Argument values:**

* **GeoPoint:** <br>constructGeoPoint(<br> latitude: 80.0,<br> longitude: -20.0,<br>)
* **Resolution:** 5

**Output:** 8507b297fffffff

***
