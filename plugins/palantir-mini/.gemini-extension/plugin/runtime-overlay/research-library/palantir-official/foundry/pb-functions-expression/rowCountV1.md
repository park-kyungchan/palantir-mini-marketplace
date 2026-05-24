---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/rowCountV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/rowCountV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7729baa056da6071a5beb7ec5dd06849af3ff6602bbf9aa88772fc4338ffe625"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Row count"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Row count

> Supported in: Batch, Faster, Streaming

Counts the number of non null rows in a group.

**Expression categories:** Aggregate

## Declared arguments

* *optional* **Expression:** *no description*<br>*Expression\<AnyType>*

**Output type:** *Long*

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

**Outputs:** 3

***

### Example 2: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| 2 |
| *null* |
| 3 |

**Outputs:** 2

***
