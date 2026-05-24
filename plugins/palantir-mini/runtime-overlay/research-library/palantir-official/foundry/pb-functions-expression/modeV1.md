---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/modeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/modeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fcb544959b6941d10317dd4eb890a2f93fe41993b2f2e394d5d05f86a224fc69"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Mode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Mode

> Supported in: Batch, Faster

Calculate mode of values in column.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column of on which mode is computed.<br>*Expression\<Any>*

**Type variable bounds:** *Any accepts Binary | Boolean | Byte | Date | Decimal | Double | Float | Integer | Long | Short | String | Timestamp*

**Output type:** *Any*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| a |
| b |
| b |
| b |
| c |
| c |
| d |

**Outputs:** b

***

### Example 2: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 1 |
| 1 |
| 2 |
| 2 |
| 2 |
| 2 |
| 4 |

**Outputs:** 2

***

### Example 3: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |

**Outputs:** *null*

***

### Example 4: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| a |
| *null* |
| *null* |
| *null* |
| c |
| c |
| d |

**Outputs:** c

***
