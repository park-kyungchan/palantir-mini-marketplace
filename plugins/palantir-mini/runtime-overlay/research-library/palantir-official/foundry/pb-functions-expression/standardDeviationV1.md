---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/standardDeviationV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/standardDeviationV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6664251b50e56661324616471340546ea483e37b8c5c72426d80da7778d01e6d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Standard deviation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Standard deviation

> Supported in: Batch, Faster

Calculate standard deviation of the values in column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The column of on which standard deviation is computed.<br>*Expression\<Numeric>*

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

**Outputs:** 0.81649658092773

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

**Outputs:** 0.5

***
