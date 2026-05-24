---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/base64DecodeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/base64DecodeV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a452a419a60cf093d07c37d7dd536652fe80c5e91eea278a7115801e94af7b35"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Base64 decode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Base64 decode

> Supported in: Batch, Faster, Streaming

Base64 decode the given expression.

**Expression categories:** Binary, Cast

## Declared arguments

* **Expression:** Expression to base64 decode.<br>*Expression\<String>*

**Output type:** *Binary*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `city_base64`

| city\_base64 | **Output** |
| ----- | ----- |
| TG9uZG9u | TG9uZG9u |
| Q29wZW5oYWdlbg== | Q29wZW5oYWdlbg== |
| TmV3IFlvcms= | TmV3IFlvcms= |

***
