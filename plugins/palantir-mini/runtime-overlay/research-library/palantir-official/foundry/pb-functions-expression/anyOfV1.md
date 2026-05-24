---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/anyOfV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/anyOfV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "afc4b591a2460fcc94007dbce5d769fdab6f25b8bd304fe51052d7ff4fd31281"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Any of"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Any of

> Supported in: Batch, Faster

Calculate the boolean 'or' of an aggregate. Nulls are considered false.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column on which to compute 'any'.<br>*Expression\<Boolean>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| true |
| false |
| true |

**Outputs:** true

***

### Example 2: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| false |
| false |
| *null* |

**Outputs:** false

***
