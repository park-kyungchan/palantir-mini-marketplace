---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidOntologyGeopointV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidOntologyGeopointV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dc9dd00b4eddb4366fc8a8141b3eda3d3c77fe524794a5115ca3c817d0cd4f02"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid Ontology GeoPoint"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid Ontology GeoPoint

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid Ontology GeoPoint. Ontology GeoPoints are strings of the format '{lat},{lon}', where -90 <= lat <= 90 and -180 <= lon <= 180.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** String to test.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geopoint`

| geopoint | **Output** |
| ----- | ----- |
| -35.307428203,149.122686883 | true |
| 149.122686883,-35.307428203 | false |
| 10.0, 20.0 | true |
|    10.0,    20.0    | true |
| not a GeoPoint | false |
| *null* | false |
| (10.0,20.0) | false |

***
