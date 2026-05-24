---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/renameStructFieldV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/renameStructFieldV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bfb063a7a40c99997f673ec8d2518558e657cc182cf8b41e74cb7b6841a47c36"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Rename struct field"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Rename struct field

> Supported in: Batch, Faster, Streaming

Rename fields within a struct.

**Expression categories:** Data preparation, Struct

## Declared arguments

* **Expression:** *no description*<br>*Expression\<Struct>*
* **Renames:** *no description*<br>*List\<Tuple\<StructLocator, Literal\<String>>>*

**Output type:** *Struct*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `struct`
* **Renames:** \[(airline.id, identifier)]

| struct | **Output** |
| ----- | ----- |
| {<br> **airline**: {<br> **id**: NA,<br>},<br>} | {<br> **airline**: {<br> **identifier**: NA,<br>},<br>} |
| {<br> **airline**: {<br> **id**: FE,<br>},<br>} | {<br> **airline**: {<br> **identifier**: FE,<br>},<br>} |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `struct`
* **Renames:** \[(airline.id, identifier)]

| struct | **Output** |
| ----- | ----- |
| *null* | *null* |

***
