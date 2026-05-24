---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/subtractManyV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/subtractManyV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fae2361017a429a90f63fccfdb44531ccb131b2cd9204a4f1f90fb844e101511"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Subtract multiple expressions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Subtract multiple expressions

> Supported in: Batch, Faster, Streaming

Calculates the difference between a number and all input columns.

**Expression categories:** Numeric

## Declared arguments

* **Expressions list:** List of expressions to be used for subtraction.<br>*List\<Expression\<Numeric>>*
* **Value to be subtracted:** Expression to subtract from.<br>*Expression\<Numeric>*

**Output type:** *Numeric*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions list:** \[`col_b`, `col_c`]
* **Value to be subtracted:** `col_a`

| col\_a | col\_b | col\_c | **Output** |
| ----- | ----- | ----- | ----- |
| 5 | 3 | 2 | 0 |
| 2 | 4 | 0 | -2 |
| -2 | -4 | -2 | 4 |

***

### Example 2: Base case

**Argument values:**

* **Expressions list:** \[`col_b`]
* **Value to be subtracted:** `col_a`

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |
| 1 | *null* | *null* |
| *null* | 10 | *null* |

***
