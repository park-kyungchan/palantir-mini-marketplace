---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/roundV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/roundV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c6e1994adb1f9a8fd5e8947f637fcd336105c88b3d1bdf48d6f2607b92bb5fb5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Round number"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Round number

> Supported in: Batch, Faster, Streaming

Round number to 'scale' decimal places.

**Expression categories:** Numeric

## Declared arguments

* **Column:** The column to apply round on.<br>*Expression\<Decimal | Double | Float>*
* *optional* **Scale:** Decimal points to round to, defaults as 0.<br>*Literal\<Integer>*

**Output type:** *Decimal | Double | Float*

## Examples

### Example 1: Base case

**Argument values:**

* **Column:** 10.123
* **Scale:** 2

**Output:** 10.12

***

### Example 2: Base case

**Argument values:**

* **Column:** 10.123
* **Scale:** *null*

**Output:** 10.0

***

### Example 3: Base case

**Argument values:**

* **Column:** `number`
* **Scale:** 2

| number | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Base case

**Argument values:**

* **Column:** `number`
* **Scale:** 0

| number | **Output** |
| ----- | ----- |
| 32352366881234567890123456789012345678 | 32352366881234567890123456789012345678 |

***

### Example 5: Base case

**Argument values:**

* **Column:** `number`
* **Scale:** -38

| number | **Output** |
| ----- | ----- |
| 10000000000000000000000000000000000078 | 0 |

***

### Example 6: Base case

**Argument values:**

* **Column:** `number`
* **Scale:** -1

| number | **Output** |
| ----- | ----- |
| 10000000000000000000000000000000000078 | 10000000000000000000000000000000000080 |

***
