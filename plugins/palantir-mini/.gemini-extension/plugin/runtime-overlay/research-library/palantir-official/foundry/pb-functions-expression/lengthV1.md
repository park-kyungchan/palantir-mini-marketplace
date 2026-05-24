---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/lengthV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/lengthV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9de562c1e50df18cca695eef0dc39eec0624889cdd592fa4085b2a4f0d858632"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Length"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Length

> Supported in: Batch, Faster, Streaming

Returns the length of each value in a string column or an array column.

**Expression categories:** Array, Numeric

## Declared arguments

* **Expression:** The expression to compute the length of.<br>*Expression\<Array\<AnyType> | Binary | Map\<AnyType, AnyType> | String>*

**Output type:** *Integer*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| hello | 5 |
| bye | 3 |

***
