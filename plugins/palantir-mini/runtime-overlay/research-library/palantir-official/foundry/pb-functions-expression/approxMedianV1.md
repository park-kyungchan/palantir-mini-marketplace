---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/approxMedianV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/approxMedianV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4b2cade5e7df2e098718650acb3bc45e0810a464c48c44f9fb919623366f6d17"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Approximate median"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Approximate median

> Supported in: Batch

Computes approximate median of values in the column.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column on which to compute the approximate median.<br>*Expression\<Numeric>*

**Output type:** *Numeric*

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
| 3 |
| 4 |
| *null* |

**Outputs:** 3

***
