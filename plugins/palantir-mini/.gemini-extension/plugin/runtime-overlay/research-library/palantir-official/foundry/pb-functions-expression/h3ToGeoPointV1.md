---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/h3ToGeoPointV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/h3ToGeoPointV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "88f6d8030596a558be310865b62f1bc6d9b415eaa3134da526daa405a4fc871c"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert H3 index to GeoPoint"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert H3 index to GeoPoint

> Supported in: Batch, Faster, Streaming

Convert an H3 index into the GeoPoint representing the center of the corresponding H3 hexagon.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** The H3 index to convert to a GeoPoint.<br>*Expression\<H3 Index>*

**Output type:** *GeoPoint*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `h3`

| h3 | **Output** |
| ----- | ----- |
| 85aa614bfffffff | {<br> **latitude**: -20.040068721942628,<br> **longitude**: 79.95021089904623,<br>} |
| 852aa84ffffffff | {<br> **latitude**: 38.926035503721714,<br> **longitude**: -77.1525762709701,<br>} |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `h3`

| h3 | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 3: Edge case

**Argument values:**

* **Expression:** `h3`

| h3 | **Output** |
| ----- | ----- |
| h3 | *null* |

***
