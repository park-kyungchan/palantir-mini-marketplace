---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/minV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/minV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "19294221c6906b40534169e505826094dcbd1719678cc55cb76a2fdfae60ff1b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Min"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Min

> Supported in: Batch, Faster, Streaming

Calculate minimum value in column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The column of on which min is computed.<br>*Expression\<ComparableType>*

**Output type:** *ComparableType*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 2 |
| 4 |
| 3 |

**Outputs:** 2

***

### Example 2: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 2 |
| *null* |
| 3 |

**Outputs:** 2

***
