---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/distinctCountV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/distinctCountV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3297a17fe6115085cd5773fe60d0a55b27ea1dcdfdf2a0332e95fc96aa3ce44c"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Distinct count"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Distinct count

> Supported in: Batch, Faster, Streaming

Calculate distinct number of values in column.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column of on which distinct count is computed.<br>*Expression\<ComparableType>*

**Output type:** *Long*

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

**Outputs:** 3

***

### Example 2: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 2 |
| 2 |
| *null* |

**Outputs:** 1

***
