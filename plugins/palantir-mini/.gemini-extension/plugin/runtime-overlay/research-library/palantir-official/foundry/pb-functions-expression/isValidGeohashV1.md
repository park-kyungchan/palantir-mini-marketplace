---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidGeohashV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidGeohashV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3f37fd3569487f0dfa397e4b7812f489c0bafa006c097dd70d7c8a96e673a889"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid Geohash"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid Geohash

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid Geohash input string.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** Geohash to check.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geohash`

| geohash | **Output** |
| ----- | ----- |
| sk4d | true |
| dt9zy9cg36j7 | true |
| not a Geohash string | false |
| *null* | false |

***
