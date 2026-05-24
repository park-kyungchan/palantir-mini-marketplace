---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/titleCaseV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/titleCaseV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0052f738b5a548e867256a897d51cf1645088d4b13c113457fc327a519ecd21b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Title case"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Title case

> Supported in: Batch, Faster, Streaming

Converts the first character of each word to be uppercase and the rest lowercase.

**Expression categories:** String

## Declared arguments

* **Expression:** The string to convert to title case.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** hello world

**Output:** Hello World

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***

### Example 3: Edge case

**Argument values:**

* **Expression:** hello-world

**Output:** Hello-world

***
