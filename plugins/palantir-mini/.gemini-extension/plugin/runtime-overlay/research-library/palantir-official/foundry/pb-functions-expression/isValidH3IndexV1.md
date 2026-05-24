---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidH3IndexV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidH3IndexV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bb7a899812b4c58b0c1a2844bdfa038d733c5b7dd0d64296cab6997dcc5fb4cb"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid H3 index"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid H3 index

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid H3 index string.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** *no description*<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `h3`

| h3 | **Output** |
| ----- | ----- |
| 862a1072fffffff | true |
| not an h3 value | false |

***
