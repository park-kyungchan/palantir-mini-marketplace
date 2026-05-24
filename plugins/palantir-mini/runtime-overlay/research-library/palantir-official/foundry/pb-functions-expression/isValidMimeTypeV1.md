---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidMimeTypeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidMimeTypeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "18cf7209016617f0473cd5d83d1b6b943dff1aee2a7f3d626b263079b896aa5c"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid MIME type"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid MIME type

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid MIME type.

**Expression categories:** Boolean, Other

## Declared arguments

* **Expression:** String representing a MIME type.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `mimeType`

| mimeType | **Output** |
| ----- | ----- |
| application/pdf | true |
| not a MIME type | false |

***
