---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/lastV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/lastV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "84b6f8bc5152670a6626b18b74e96eb6a3cd5b09c685ce5bd057f5e5fe5b4fe9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Last"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Last

> Supported in: Batch, Faster, Streaming

Last item in the group. Note, if used within an aggregate or unordered window, the row selected will be non-deterministic.

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
| 2 |
| 4 |
| 3 |
| *null* |

**Outputs:** *null*

***

### Example 2: Base case

**Argument values:**

* **Expression:** `values`
* **Ignore nulls:** true

**Given input table:**

| values |
| ----- |
| 2 |
| 4 |
| 3 |
| *null* |

**Outputs:** 3

***
