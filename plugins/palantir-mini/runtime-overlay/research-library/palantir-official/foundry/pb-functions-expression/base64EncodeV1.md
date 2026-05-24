---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/base64EncodeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/base64EncodeV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "181e35f1ef8362b06f27a86df7cb07f88fe2cda8a1106cecbe8659533f2b5be6"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Base64 encode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Base64 encode

> Supported in: Batch, Faster, Streaming

Base64 encode the given expression.

**Expression categories:** Binary, Cast

## Declared arguments

* **Expression:** String or binary expression to encode.<br>*Expression\<Binary | String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| TG9uZG9u | TG9uZG9u |
| Q29wZW5oYWdlbg== | Q29wZW5oYWdlbg== |
| TmV3IFlvcms= | TmV3IFlvcms= |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| London | TG9uZG9u |
| Copenhagen | Q29wZW5oYWdlbg== |
| New York | TmV3IFlvcms= |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Null case

**Argument values:**

* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| *null* | *null* |

***
