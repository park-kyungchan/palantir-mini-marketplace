---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/xzCurveEncodeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/xzCurveEncodeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b068ff04c0040a5a7d32a6384ea72ed4ee859611c96103e02226446076607d09"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Get XZ curve index of an envelope"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get XZ curve index of an envelope

> Supported in: Batch, Streaming

Encodes the envelope in an XZ curve.

**Expression categories:** Geospatial

## Declared arguments

* **Curve preset:** Specifies the curve preset to use, higher resolution curves are more expensive to query but produce fewer false positives.<br>*Enum\<LonLat10km, LonLat150km, LonLat1km>*
* **Envelope:** Geometry envelope to index with longitude mapped to x, and latitude mapped to y.<br>*Expression\<LatLonBoundingBox>*

**Output type:** *Long*

## Examples

### Example 1: Base case

**Argument values:**

* **Curve preset:** `LON_LAT_10KM`
* **Envelope:** `envelope`

| envelope | **Output** |
| ----- | ----- |
| {<br> maxLat -> 2.0,<br> maxLon -> 3.0,<br> minLat -> 0.0,<br> minLon -> 1.0,<br>} | 16777222 |
| {<br> maxLat -> 2.0,<br> maxLon -> 3.0,<br> minLat -> *null*,<br> minLon -> 1.0,<br>} | *null* |

***
