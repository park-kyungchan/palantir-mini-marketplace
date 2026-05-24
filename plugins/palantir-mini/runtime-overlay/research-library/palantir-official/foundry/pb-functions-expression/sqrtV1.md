---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/sqrtV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/sqrtV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8dea67b117b29136262bb27f715498f313fafaddce14cc3441427022fe00bb03"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Square root"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Square root

> Supported in: Batch, Faster, Streaming

Calculates the square root of a column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** Expression to calculate square root of.<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 9.0

**Output:** 3.0

***

### Example 2: Base case

**Argument values:**

* **Expression:** 16.3216

**Output:** 4.04

***

### Example 3: Null case

**Argument values:**

* **Expression:** `value`

| value | **Output** |
| ----- | ----- |
| *null* | *null* |

***
