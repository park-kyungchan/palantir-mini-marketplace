---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/numericDistributionV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/numericDistributionV2/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "222ecd9f7c3a43afc2b2d68529117da8446b8a04ee5ce9f020817ae85d4a45cd"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Numeric distribution"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Numeric distribution

> Supported in: Batch, Faster

Computes the distribution of numeric values in a specified column.

**Transform categories**: Numeric

## Declared arguments

* **Bucket count:** Number of buckets to distribute over.<br>*Literal\<Long>*
* **Column:** Column to compute distribution for.<br>*Column\<Numeric>*
* **Dataset:** Dataset to apply distribution to.<br>*Table*
* **Maximum value:** Maximum value for distribution.<br>*Literal\<Double>*
* **Minimum value:** Minimum value for distribution.<br>*Literal\<Double>*

## Examples

### Example 1: Base case

**Argument values:**

* **Bucket count:** 10
* **Column:** `value`
* **Dataset:** ri.foundry.main.dataset.a
* **Maximum value:** 20.0
* **Minimum value:** 0.0

**Input:**

| value |
| ----- |
| 0.0 |
| 0.0 |
| 1.3 |
| 5.3 |
| 10.5 |

**Output:**

| bucket | min\_value | max\_value | count | bucket\_start | bucket\_end |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 0 | 0.0 | 1.3 | 3 | 0.0 | 2.0 |
| 2 | 5.3 | 5.3 | 1 | 4.0 | 6.0 |
| 5 | 10.5 | 10.5 | 1 | 10.0 | 12.0 |

***

### Example 2: Base case

**Argument values:**

* **Bucket count:** 3
* **Column:** `value`
* **Dataset:** ri.foundry.main.dataset.a
* **Maximum value:** 25.0
* **Minimum value:** -5.0

**Input:**

| value |
| ----- |
| -15 |
| -5 |
| 0 |
| 15 |
| 20 |

**Output:**

| bucket | min\_value | max\_value | count | bucket\_start | bucket\_end |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 0 | -5 | 0 | 2 | -5.0 | 5.0 |
| 2 | 15 | 20 | 2 | 15.0 | 25.0 |

***

### Example 3: Edge case

**Argument values:**

* **Bucket count:** 1
* **Column:** `value`
* **Dataset:** ri.foundry.main.dataset.a
* **Maximum value:** 20.0
* **Minimum value:** 20.0

**Input:**

| value |
| ----- |
| -15 |
| -5 |
| 0 |
| 15 |
| 20 |

**Output:**

| bucket | min\_value | max\_value | count | bucket\_start | bucket\_end |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 0 | 20 | 20 | 1 | 20.0 | 20.0 |

***

### Example 4: Edge case

**Argument values:**

* **Bucket count:** 1
* **Column:** `value`
* **Dataset:** ri.foundry.main.dataset.a
* **Maximum value:** 20.0
* **Minimum value:** -5.0

**Input:**

| value |
| ----- |
| -15 |
| -5 |
| 0 |
| 15 |
| 20 |

**Output:**

| bucket | min\_value | max\_value | count | bucket\_start | bucket\_end |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 0 | -5 | 15 | 3 | -5.0 | 20.0 |
| 1 | 20 | 20 | 1 | 20.0 | 45.0 |

***
