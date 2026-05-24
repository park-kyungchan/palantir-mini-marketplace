---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToMgrsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geoPointToMgrsV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "675f85a1a0756c0a57762106f4f9aec5e2da68e4821af1a2583cfe4f4d9e819e"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert GeoPoint to MGRS"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert GeoPoint to MGRS

> Supported in: Batch, Faster, Streaming

Converts a GeoPoint following the WGS84 coordinate system (which is EPSG:4326) to a MGRS (military grid reference system) coordinate. The output MGRS will follow a space-delimited format with 5 digits of precision.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** GeoPoint to convert.<br>*Expression\<GeoPoint>*

**Output type:** *MGRS*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geoPoint`

| geoPoint | **Output** |
| ----- | ----- |
| {<br> latitude -> 88.99999659707431,<br> longitude -> 0.9996456505181999,<br>} | Z AF 01937 88990 |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `geoPoint`

| geoPoint | **Output** |
| ----- | ----- |
| {<br> latitude -> 21.409796671597924,<br> longitude -> -157.91608117421092,<br>} | 4Q FJ 12345 67889 |
| {<br> latitude -> 21.338665624760598,<br> longitude -> -157.93921670599434,<br>} | 4Q FJ 10000 59999 |
| {<br> latitude -> 21.40898645576642,<br> longitude -> -157.91652127483704,<br>} | 4Q FJ 12300 67799 |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `geoPoint`

| geoPoint | **Output** |
| ----- | ----- |
| *null* | *null* |

***
