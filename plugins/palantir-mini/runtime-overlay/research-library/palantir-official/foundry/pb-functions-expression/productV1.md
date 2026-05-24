---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/productV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/productV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bb933a423e158650d28d33f9424543527556f07d3dc22c551250ade6cd79e501"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Product

> Supported in: Batch

Calculates the product of all input columns.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** *no description*<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `factor`

**Given input table:**

| factor |
| ----- |
| 2 |
| 4 |
| 3 |

**Outputs:** 24.0

***

### Example 2: Base case

**Argument values:**

* **Expression:** `factor`

**Given input table:**

| factor |
| ----- |
| 2 |
| *null* |
| 3 |

**Outputs:** 6.0

***
