---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/varianceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/varianceV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "31be32fa60f812d3ea31c34fa93a76be0d68b252eb6c7193f8173c5eb92fd6e4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Variance"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Variance

> Supported in: Batch, Streaming

Calculate population variance of values in column.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column of on which variance is computed.<br>*Expression\<Numeric>*

**Output type:** *Double*

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

**Outputs:** 0.66666666667

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

**Outputs:** 0.25

***
