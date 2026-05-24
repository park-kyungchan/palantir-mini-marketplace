---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToGeohashV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geoPointToGeohashV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ee48857c91eb7735e223b3248b22011b272cfa26725ab3b5b192aedb36496d1d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert GeoPoint to Geohash"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert GeoPoint to Geohash

> Supported in: Batch, Faster, Streaming

Converts a GeoPoint to a base32-encoded Geohash with specified precision that contains the GeoPoint. For more information on Geohash, see: https://en.wikipedia.org/wiki/Geohash .

**Expression categories:** Geospatial

## Declared arguments

* **GeoPoint:** The GeoPoint to convert.<br>*Expression\<GeoPoint>*
* **Output Geohash precision:** The number of base32 characters returned in the output Geohash string.<br>*Expression\<Integer>*

**Output type:** *Geohash*

## Examples

### Example 1: Base case

**Argument values:**

* **GeoPoint:** `point`
* **Output Geohash precision:** 5

| point | **Output** |
| ----- | ----- |
| {<br> **latitude**: -20.0,<br> **longitude**: 80.0,<br>} | mu2yh |
| {<br> **latitude**: -77.0599,<br> **longitude**: 38.9031,<br>} | hf79t |
| *null* | *null* |

***

### Example 2: Base case

**Argument values:**

* **GeoPoint:** `point`
* **Output Geohash precision:** `precision`

| point | precision | **Output** |
| ----- | ----- | ----- |
| {<br> **latitude**: -20.0,<br> **longitude**: 80.0,<br>} | 5 | mu2yh |
| {<br> **latitude**: -77.0599,<br> **longitude**: 38.9031,<br>} | 3 | hf7 |
| {<br> **latitude**: -82.77450568,<br> **longitude**: -179.55742495,<br>} | 12 | 0123456789zb |
| {<br> **latitude**: 1.0,<br> **longitude**: -1.0,<br>} | 12 | ebpm9npc6m9b |
| {<br> **latitude**: 1.0,<br> **longitude**: -1.0,<br>} | *null* | *null* |

***
