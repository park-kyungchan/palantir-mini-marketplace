---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/addV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/addV2/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d45bd297d17b15f2d360c63609396b8dac7c48b0e289040f43f5ded52ec4fcd9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Add numbers"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add numbers

> Supported in: Batch, Faster, Streaming

Calculates the sum of all input columns.

**Expression categories:** Numeric

## Declared arguments

* **Expressions:** List of columns to be added.<br>*List\<Expression\<Numeric>>*

**Output type:** *Numeric*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[`col_a`, `col_b`]

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| 0 | 1 | 1 |
| 3 | -2 | 1 |

***
