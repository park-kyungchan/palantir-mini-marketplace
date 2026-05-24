---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/nullifyEmptyStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/nullifyEmptyStringV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8d786a9d31b80ed58bf123539c297ca685250522fa56e9a2d587de6c31c659ac"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Nullify empty string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Nullify empty string

> Supported in: Batch, Faster, Streaming

Convert empty strings to null.

**Expression categories:** String

## Declared arguments

* **Expression:** *no description*<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** *empty string*

**Output:** *null*

***

### Example 2: Base case

**Argument values:**

* **Expression:** hello world

**Output:** hello world

***

### Example 3: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
