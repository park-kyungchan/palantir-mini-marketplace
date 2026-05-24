---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/getManyStructFieldsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/getManyStructFieldsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c13a254cac4937ffca362924930265b1fef61c0606f70ca01acacc9bcf227f64"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract many struct fields"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract many struct fields

> Supported in: Batch, Faster

Extracts many fields from a struct. Original struct will be dropped.

**Transform categories**: Struct

## Declared arguments

* **Dataset:** Dataset containing struct column.<br>*Table*
* **Locators:** Locators for fields to access in the struct.<br>*List\<Tuple\<StructLocator, Literal\<String>>>*
* **Struct:** Input struct.<br>*Column\<Struct>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Locators:** \[(airline.name, airline), (tail\_no, tail\_number)]
* **Struct:** `raw`

**Input:**

| raw |
| ----- |
| {<br> **airline**: {<br> **id**: NA,<br> **name**: new air,<br>},<br> **tail\_no**: NA-123,<br>} |
| {<br> **airline**: {<br> **id**: FA,<br> **name**: foundry airways,<br>},<br> **tail\_no**: FA-123,<br>} |

**Output:**

| airline | tail\_number |
| ----- | ----- |
| new air | NA-123 |
| foundry airways | FA-123 |

***
