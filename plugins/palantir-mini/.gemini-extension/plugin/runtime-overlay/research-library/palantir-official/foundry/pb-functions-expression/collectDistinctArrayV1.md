---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/collectDistinctArrayV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/collectDistinctArrayV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5d3e6c1164173944d839eec6c71e84b7bbdd83bb08775c12c09e38d9c7940e3f"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Collect distinct array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Collect distinct array

> Supported in: Batch, Faster, Streaming

Collects an array of deduplicated values within each group. Null values are ignored.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column of values to collect into an array, keeping distinct values only.<br>*Expression\<T>*

**Type variable bounds:** *T accepts ComparableType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `factor`

**Given input table:**

| factor |
| ----- |
| 2 |
| 2 |
| 3 |

**Outputs:** \[ 2, 3 ]

***

### Example 2: Null case

**Argument values:**

* **Expression:** `factor`

**Given input table:**

| factor |
| ----- |
| 2 |
| *null* |
| 3 |

**Outputs:** \[ 2, 3 ]

***
