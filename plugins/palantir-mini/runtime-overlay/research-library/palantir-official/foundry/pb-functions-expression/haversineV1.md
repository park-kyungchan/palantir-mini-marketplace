---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/haversineV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/haversineV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d28bcb26380d6a1702e94ed8fd488692634a3ffd2b3259e454403ebfd1d5e234"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Calculate haversine distance"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Calculate haversine distance

> Supported in: Batch, Faster, Streaming

Calculates the haversine distance between two latitude and longitude point pairs in meters.

**Expression categories:** Geospatial

## Declared arguments

* **Point a:** Longitude and latitude for point b.<br>*Expression\<GeoPoint>*
* **Point b:** Longitude and latitude for point a.<br>*Expression\<GeoPoint>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Point a:** `point_a`
* **Point b:** `point_b`

| point\_a | point\_b | **Output** |
| ----- | ----- | ----- |
| {<br> **latitude**: 41.507483,<br> **longitude**: -99.436554,<br>} | {<br> **latitude**: 38.504048,<br> **longitude**: -98.315949,<br>} | 347328.82778977347 |
| {<br> **latitude**: 22.308919,<br> **longitude**: 113.914603,<br>} | {<br> **latitude**: -33.946111,<br> **longitude**: 151.177222,<br>} | 7393894.00134442 |

***
