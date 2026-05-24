---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/urlEncodeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/urlEncodeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cafa3532334a4b2324a5ac0988ad6fb197cd7c8648a49cd377fd27e1277068a0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Url encode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Url encode

> Supported in: Batch, Faster, Streaming

Percent-encodes a string to be sent in a url.

**Expression categories:** String

## Declared arguments

* **Expression:** The expression to url encode.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| raw\_string\_with\_no\_special\_characters | raw\_string\_with\_no\_special\_characters |
| test/api?string=3 | test%2Fapi%3Fstring%3D3 |

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
