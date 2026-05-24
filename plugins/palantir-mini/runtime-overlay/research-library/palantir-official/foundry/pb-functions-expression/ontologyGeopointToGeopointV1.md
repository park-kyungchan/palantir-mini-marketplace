---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/ontologyGeopointToGeopointV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/ontologyGeopointToGeopointV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7a9ac092817b1a1be86ff4c0b4d5bf7cdcd59907a41430d1a6d9847e3433c0c5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert from Ontology GeoPoint"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert from Ontology GeoPoint

> Supported in: Batch, Faster, Streaming

Convert an Ontology GeoPoint into a regular GeoPoint. Ontology GeoPoints are strings of the format '{lat},{lon}', where -90 <= lat <= 90 and -180 <= lon <= 180. Regular GeoPoints are structures of the format {"longitude": {long},"latitude": {lat}}.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** Ontology GeoPoint to convert.<br>*Expression\<Ontology GeoPoint>*

**Output type:** *GeoPoint*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geopoint`

| geopoint | **Output** |
| ----- | ----- |
| -20.0000000,80.0000000 | {<br> **latitude**: -20.0,<br> **longitude**: 80.0,<br>} |
| 38.9031000,-77.0599000 | {<br> **latitude**: 38.9031,<br> **longitude**: -77.0599,<br>} |
| 41.9876543,-99.1234568 | {<br> **latitude**: 41.9876543,<br> **longitude**: -99.1234568,<br>} |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `geopoint`

| geopoint | **Output** |
| ----- | ----- |
| 38.9031000, 41.9876543, 80.0000000 | *null* |
| A, 41.9876543 | *null* |
| this is a, test string | *null* |
| *null* | *null* |

***
