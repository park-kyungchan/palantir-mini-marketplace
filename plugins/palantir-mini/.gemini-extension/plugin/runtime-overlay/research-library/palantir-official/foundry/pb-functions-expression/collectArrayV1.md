---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/collectArrayV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/collectArrayV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bda9c204eb327729c54cd600b95f95811486e445b9d973d0f7eabf26767cf862"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Collect array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Collect array

> Supported in: Batch, Faster, Streaming

Collects an array of values within each group. Null values are ignored.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column of values to collect into an array.<br>*Expression\<T>*

**Type variable bounds:** *T accepts AnyType*

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

**Outputs:** \[ 2, 2, 3 ]

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
