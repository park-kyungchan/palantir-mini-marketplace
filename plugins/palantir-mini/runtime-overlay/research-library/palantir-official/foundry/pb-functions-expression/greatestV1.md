---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/greatestV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/greatestV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "20ab90a331e60ca0738bb661bd5ccf0ddee300644d76555979b0d289b3b167cc"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Greatest"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Greatest

> Supported in: Batch, Faster, Streaming

Computes the greatest value amongst all input columns, skipping null values.

**Expression categories:** Numeric

## Declared arguments

* **Expressions:** List of columns from which to compute greatest value.<br>*List\<Expression\<T>>*

**Type variable bounds:** *T accepts ComparableType*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[`a`, `b`, `c`]

| a | b | c | **Output** |
| ----- | ----- | ----- | ----- |
| 1 | 2 | 3 | 3 |
| 1 | 3 | 2 | 3 |
| 3 | 2 | 1 | 3 |

***

### Example 2: Null case

**Description:** Returns null if values of all inputs are null.

**Argument values:**

* **Expressions:** \[`a`, `b`]

| a | b | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |

***

### Example 3: Null case

**Description:** Any null values are ignored for comparison purposes.

**Argument values:**

* **Expressions:** \[`a`, `b`]

| a | b | **Output** |
| ----- | ----- | ----- |
| *null* | -2147483648 | -2147483648 |
| *null* | 0 | 0 |
| *null* | 2147483647 | 2147483647 |

***
