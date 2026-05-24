---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/constructGeoPointV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/constructGeoPointV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "86eb4c960c43596218c853fae13b21cb4c406f714a928535c9af79e431607ffd"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create GeoPoint"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create GeoPoint

> Supported in: Batch, Faster, Streaming

Creates a GeoPoint column from a latitude and longitude column. Validates that the latitude parameter is between -90 and 90, inclusive, and that the longitude parameter is between -180 and 180, inclusive; if not, returns a null value.

**Expression categories:** Geospatial

## Declared arguments

* **Latitude:** Latitude column.<br>*Expression\<Double>*
* **Longitude:** Longitude column.<br>*Expression\<Double>*

**Output type:** *GeoPoint*

## Examples

### Example 1: Base case

**Argument values:**

* **Latitude:** `lat`
* **Longitude:** `lon`

| lat | lon | **Output** |
| ----- | ----- | ----- |
| 32.0 | 58.0 | {<br> latitude -> 32.0,<br> longitude -> 58.0,<br>} |
| 320.0 | 58.0 | *null* |

***

### Example 2: Null case

**Argument values:**

* **Latitude:** `lat`
* **Longitude:** `lon`

| lat | lon | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |
| *null* | 58.0 | *null* |
| 32.0 | *null* | *null* |
| NaN | 30.0 | *null* |

***
