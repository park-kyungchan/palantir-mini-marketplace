---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/urlDecodeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/urlDecodeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d0bd8bd5c4cf269511ebe945ed126ea2e619430e85d5b436ae4aef01487d6597"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Url decode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Url decode

> Supported in: Batch, Faster, Streaming

Decodes a percent-encoded string to plain text.

**Expression categories:** Cast, String

## Declared arguments

* **Expression:** The expression to url decode.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| raw\_string\_with\_no\_special\_characters | raw\_string\_with\_no\_special\_characters |
| test%2Fapi%3Fstring%3D3 | test/api?string=3 |

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
