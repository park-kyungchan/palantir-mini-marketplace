---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/mgrsToGeoPointV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/mgrsToGeoPointV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "23a0eed5091b21990895e7ac108200ba05605bf82da6d3e3947e6f29fcc459b3"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert MGRS to GeoPoint"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert MGRS to GeoPoint

> Supported in: Batch, Faster, Streaming

Converts a MGRS (military grid reference system) coordinate into a GeoPoint following the WGS84 coordinate system (which is EPSG:4326).

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** MGRS (military grid reference system) coordinate to convert.<br>*Expression\<MGRS>*

**Output type:** *GeoPoint*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `mgrs`

| mgrs | **Output** |
| ----- | ----- |
| ZAF0193788990 | {<br> **latitude**: 88.99999659707431,<br> **longitude**: 0.9996456505181999,<br>} |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `mgrs`

| mgrs | **Output** |
| ----- | ----- |
| 4Q FJ 12345 67890 | {<br> **latitude**: 21.409796671597924,<br> **longitude**: -157.91608117421092,<br>} |
| 4Q FJ 1 6 | {<br> **latitude**: 21.338665624760598,<br> **longitude**: -157.93921670599434,<br>} |
| 4Q FJ 123 678 | {<br> **latitude**: 21.40898645576642,<br> **longitude**: -157.91652127483704,<br>} |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `mgrs`

| mgrs | **Output** |
| ----- | ----- |
| *null* | *null* |

***
