---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/sampleVarianceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/sampleVarianceV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "475af4507ed0f24a2eede692fbd26df723cb6ff4eb44ea06bf399684c99f1601"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Sample variance"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sample variance

> Supported in: Batch, Streaming

Calculate the sample variance of values in column.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** Calculate the sample variance of this expression.<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 2 |
| 2 |
| 3 |

**Outputs:** 0.33333333333

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
