---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isNaNV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isNaNV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ccfa785e1625fe5b1f65961d73fb5721e923093c90cd0cdb1820f53c76aec712"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is NaN"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is NaN

> Supported in: Batch, Faster, Streaming

Returns true if the input is nan, false otherwise.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** The expression checks is the numerical expression is nan.<br>*Expression\<Double | Float>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** NaN

**Output:** true

***

### Example 2: Base case

**Argument values:**

* **Expression:** 12.57

**Output:** false

***

### Example 3: Null case

**Argument values:**

* **Expression:** *null*

**Output:** false

***

### Example 4: Edge case

**Argument values:**

* **Expression:** `numbers`

| numbers | **Output** |
| ----- | ----- |
| NaN | true |

***
