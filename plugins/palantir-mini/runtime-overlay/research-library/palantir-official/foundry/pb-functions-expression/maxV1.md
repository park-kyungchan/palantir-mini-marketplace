---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/maxV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/maxV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b40c6695567f94ab89b85f00798320e7e82e76ec32277fe0bb7ffa8c7bf099b4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Max"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Max

> Supported in: Batch, Faster, Streaming

Calculate maximum value in column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The column of on which max is computed.<br>*Expression\<ComparableType>*

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

**Outputs:** 4

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

**Outputs:** 3

***
