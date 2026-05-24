---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/sumV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/sumV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3a00e5a43036891297a93ee2fef6a730f9234454d3d9f68f5e63af57d55fb6c5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Sum"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sum

> Supported in: Batch, Faster, Streaming

Sums the specified expression.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The column to be summed.<br>*Expression\<Numeric>*

**Output type:** *Decimal | Double | Long*

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

**Outputs:** 9

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

**Outputs:** 5

***

### Example 3: Edge case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 1.111111111111 |
| 1.111111111111 |

**Outputs:** 2.222222222222

***
