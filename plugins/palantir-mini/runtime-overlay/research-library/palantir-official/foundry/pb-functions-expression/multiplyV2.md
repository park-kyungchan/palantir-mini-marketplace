---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/multiplyV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/multiplyV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d7ee2c31672c018e533c487776e03614b22be641f30617b316218d8563339bd9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Multiply numbers"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Multiply numbers

> Supported in: Batch, Faster, Streaming

Calculates the product of all input columns.

**Expression categories:** Numeric

## Declared arguments

* **Expressions:** List of columns to be multiplied.<br>*List\<Expression\<Numeric>>*

**Output type:** *Numeric*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[`col_a`, `col_b`, `col_c`]

| col\_a | col\_b | col\_c | **Output** |
| ----- | ----- | ----- | ----- |
| 10 | 2 | 3 | 60 |

***

### Example 2: Null case

**Argument values:**

* **Expressions:** \[`col_a`, `col_b`]

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |

***

### Example 3: Null case

**Argument values:**

* **Expressions:** \[`col_a`, `col_b`]

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| 1 | *null* | *null* |

***

### Example 4: Null case

**Argument values:**

* **Expressions:** \[`col_a`, `col_b`]

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| *null* | 1 | *null* |

***
