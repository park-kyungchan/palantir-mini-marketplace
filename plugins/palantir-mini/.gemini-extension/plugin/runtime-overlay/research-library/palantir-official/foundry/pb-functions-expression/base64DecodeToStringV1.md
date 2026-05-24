---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/base64DecodeToStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/base64DecodeToStringV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f6269ccebe5a9aa384785cc4b5383f3cf236afac10d61ea9164a83985165080f"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Base 64 decode to string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Base 64 decode to string

> Supported in: Batch, Faster, Streaming

Base64 decode the given expression. Uses utf-8 encoding for binary.

**Expression categories:** Binary, Cast, String

## Declared arguments

* **Expression:** String or binary expression to decode from base64.<br>*Expression\<Binary | String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `encoded`

| encoded | **Output** |
| ----- | ----- |
| Wm05dg== | foo |
| WW1GeQ== | bar |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `encoded`

| encoded | **Output** |
| ----- | ----- |
| Zm9v | foo |
| YmFy | bar |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `encoded`

| encoded | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Null case

**Argument values:**

* **Expression:** `encoded`

| encoded | **Output** |
| ----- | ----- |
| *null* | *null* |

***
