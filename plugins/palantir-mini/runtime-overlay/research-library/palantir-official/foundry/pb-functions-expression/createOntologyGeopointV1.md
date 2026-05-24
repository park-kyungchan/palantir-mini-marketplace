---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/createOntologyGeopointV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/createOntologyGeopointV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "519c706474a15d0add4ea2e15e733dfe32ab61d87adce7a49e94dd43006116d5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert to Ontology GeoPoint"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert to Ontology GeoPoint

> Supported in: Batch, Faster, Streaming

Convert a GeoPoint into a string that the Ontology will accept for a geo-indexed column (a geohash type column). Ontology GeoPoints are strings of the format '{lat},{lon}', where -90 <= lat <= 90 and -180 <= lon <= 180.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** GeoPoint to convert.<br>*Expression\<GeoPoint>*

**Output type:** *Ontology GeoPoint*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `point`

| point | **Output** |
| ----- | ----- |
| {<br> **latitude**: -20.0,<br> **longitude**: 80.0,<br>} | -20.0000000,80.0000000 |
| {<br> **latitude**: 38.9031,<br> **longitude**: -77.0599,<br>} | 38.9031000,-77.0599000 |
| {<br> **latitude**: 41.987654321,<br> **longitude**: -99.123456789,<br>} | 41.9876543,-99.1234568 |
| *null* | *null* |

***
