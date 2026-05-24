---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/medianV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/medianV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2c00f2993b8384068bd32779a327539e8c792b7cd011f0986eae0f1c2e6c666b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Median"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Median

> Supported in: Batch, Faster

Calculate median of values in column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The column of on which median is computed.<br>*Expression\<Numeric>*

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

### Example 2: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 5 |
| 5 |
| 5 |
| 10 |
| 10 |

**Outputs:** 5.0

***

### Example 3: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 1 |
| 2 |
| 3 |
| 4 |

**Outputs:** 2.5

***

### Example 4: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| *null* |
| *null* |
| *null* |

**Outputs:** *null*

***

### Example 5: Null case

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

### Example 6: Edge case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 10 |
| 5 |
| 5 |
| 10 |
| 10 |

**Outputs:** 10.0

***

### Example 7: Edge case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |

**Outputs:** *null*

***

### Example 8: Edge case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 42 |

**Outputs:** 42.0

***
