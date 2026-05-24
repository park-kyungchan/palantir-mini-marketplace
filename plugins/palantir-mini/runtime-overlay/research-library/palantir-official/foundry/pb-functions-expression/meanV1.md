---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/meanV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/meanV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "67e1f8dc1af0860b4f4385a398ea31bfa58a9273a5d7814b4f9fc7bb7b2c8b5a"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Mean"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Mean

> Supported in: Batch, Faster, Streaming

Calculate mean of values in column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The column of on which mean is computed.<br>*Expression\<Numeric>*

**Output type:** *Decimal | Double*

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

**Outputs:** 3.0

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

**Outputs:** 2.5

***
