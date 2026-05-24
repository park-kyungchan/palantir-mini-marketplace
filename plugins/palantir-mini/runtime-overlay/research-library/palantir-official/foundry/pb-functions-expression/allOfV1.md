---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/allOfV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/allOfV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d853f55952c23cd49cc14abad4aedfcb2ab668654b392ebf46650cb27ef689f0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > All of"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# All of

> Supported in: Batch, Faster

Calculate the boolean 'and' of an aggregate. Nulls are considered false.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** The column on which to compute 'all'.<br>*Expression\<Boolean>*

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

**Outputs:** false

***

### Example 2: Null case

**Argument values:**

* **Expression:** `values`

**Given input table:**

| values |
| ----- |
| true |
| true |
| *null* |

**Outputs:** false

***
