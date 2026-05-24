---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidRidV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidRidV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "962c84f0b32a70a4ffb9f030d63e89f60acc7a485e5c86732f825c246bcb46d1"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid rid"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid rid

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid Foundry resource identifier.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** String representing a resource identifier.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `rid`

| rid | **Output** |
| ----- | ----- |
| ri.foundry.main.dataset.e9008fee-a32a-449d-8ab4-d6d65a3b4ecc | true |
| ri.foundry.main.transaction.00000049-8fbb-6a15-bd27-9f2c9ae9a47b | true |
| ri.foundry.malformed | false |
| not a rid | false |

***
