---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/cleanStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/cleanStringV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8560cfd20bbfabb5b31731c28bd065ee599d9078e469f6bc31e53d6a74d2ca0c"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Clean string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Clean string

> Supported in: Batch, Faster, Streaming

Applies the set of clean actions on the expression.

**Expression categories:** Data preparation, String

## Declared arguments

* **Clean actions:** Set of actions to be applied.<br>*Set\<Enum\<Normalize whitespace, Nullify empty, Trim>>*
* **Expression:** String to be cleaned.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Clean actions:** {`normalize`}
* **Expression:** hello     world

**Output:** hello world

***

### Example 2: Base case

**Argument values:**

* **Clean actions:** {`nullify_empty`}
* **Expression:** *empty string*

**Output:** *null*

***

### Example 3: Base case

**Argument values:**

* **Clean actions:** {`trim`}
* **Expression:**   hello world

**Output:** hello world

***

### Example 4: Null case

**Argument values:**

* **Clean actions:** {`trim`}
* **Expression:** *null*

**Output:** *null*

***
