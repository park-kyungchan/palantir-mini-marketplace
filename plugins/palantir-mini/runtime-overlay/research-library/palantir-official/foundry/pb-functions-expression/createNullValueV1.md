---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/createNullValueV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/createNullValueV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "29f78b047bf7eea98c9c25ed973fe3af91607fcf5028fe10a20e0fcbf375c61f"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create null value"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create null value

> Supported in: Batch, Faster, Streaming

Returns a null value of the given type.

**Expression categories:** Data preparation

## Declared arguments

* **Type:** The type of the null value to create.<br>*Type\<T>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Type:** Array\<String>

**Output:** *null*

***

### Example 2: Base case

**Argument values:**

* **Type:** Map\<String, String>

**Output:** *null*

***

### Example 3: Base case

**Argument values:**

* **Type:** String

**Output:** *null*

***

### Example 4: Base case

**Argument values:**

* **Type:** Struct\<string:String, array:Array\<String>>

**Output:** *null*

***
