---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/getStructFieldV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/getStructFieldV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dac8b572b4116f9e422bd4195823ba01165119e4e2e9943b690643966ab8c250"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Get struct field"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get struct field

> Supported in: Batch, Faster, Streaming

Extracts a field from a struct.

**Expression categories:** Struct

## Declared arguments

* **Locator:** Extract inner elements with multiple entries like \['author', 'email'].<br>*StructLocator*
* **Struct:** *no description*<br>*Expression\<Struct>*

**Output type:** *AnyType*

## Examples

### Example 1: Base case

**Argument values:**

* **Locator:** airline.id
* **Struct:** `struct`

| struct | **Output** |
| ----- | ----- |
| {<br> **airline**: {<br> **id**: NA,<br>},<br>} | NA |
| {<br> **airline**: {<br> **id**: FE,<br>},<br>} | FE |

***

### Example 2: Base case

**Argument values:**

* **Locator:** airline.id
* **Struct:** `struct`

| struct | **Output** |
| ----- | ----- |
| {<br> **airline**: *null*,<br>} | *null* |
| {<br> **airline**: {<br> **id**: *null*,<br>},<br>} | *null* |
| *null* | *null* |

***
