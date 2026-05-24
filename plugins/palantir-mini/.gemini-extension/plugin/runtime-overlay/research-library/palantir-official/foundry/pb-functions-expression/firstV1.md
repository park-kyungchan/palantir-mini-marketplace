---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/firstV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/firstV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "59c1a8136e8afdde93e2424a2e5a91883e7bf4c5b57094706b45d089169266ca"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > First"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# First

> Supported in: Batch, Faster, Streaming

First item in the group. Note, if used within an aggregate or unordered window, the row selected will be non-deterministic.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** Expression to aggregate.<br>*Expression\<T>*
* **Ignore nulls:** If true, null values will be ignored.<br>*Literal\<Boolean>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `values`
* **Ignore nulls:** false

**Given input table:**

| values |
| ----- |
| *null* |
| 2 |
| 4 |
| 3 |

**Outputs:** *null*

***

### Example 2: Base case

**Argument values:**

* **Expression:** `values`
* **Ignore nulls:** true

**Given input table:**

| values |
| ----- |
| *null* |
| 2 |
| 4 |
| 3 |

**Outputs:** 2

***
