---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b27ecaea7991be323edbc8a6757424bab9a542f909573594c4e728c2df7fcd09"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Absolute value"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Absolute value

> Supported in: Batch, Faster, Streaming

Returns the absolute value.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** Compute absolute value of this expression.<br>*Expression\<T>*

**Type variable bounds:** *T accepts Numeric*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `numeric_column`

| numeric\_column | **Output** |
| ----- | ----- |
| 0.0 | 0.0 |
| 1.1 | 1.1 |
| -1.1 | 1.1 |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `numeric_column`

| numeric\_column | **Output** |
| ----- | ----- |
| *null* | *null* |

***
