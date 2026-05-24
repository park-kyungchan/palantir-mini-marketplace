---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/trimV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/trimV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "20c2ebc98815a72bea4329f8c06b62f191f73c225b614a294d2fb258caaae1fe"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Trim whitespace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Trim whitespace

> Supported in: Batch, Faster, Streaming

Trims whitespace at beginning and end of string. Whitespace is defined as characters in any of: 1) Unicode's \p{whitespace} set, 2) Java's String#trim() method, or 3) Java's Character#isWhitespace() method.

**Expression categories:** Data preparation, String

## Declared arguments

* **Expression:** Input string to trim whitespace from.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:**    hello world

**Output:** hello world

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
