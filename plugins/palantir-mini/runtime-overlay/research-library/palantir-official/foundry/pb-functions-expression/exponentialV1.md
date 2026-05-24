---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/exponentialV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/exponentialV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "51958c5be9136f8a0b3f2c9ca1b8a0a4bedf82f773e4bb4be8bbd8a75e0f1e84"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Exponential"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Exponential

> Supported in: Batch, Faster, Streaming

Calculates the exponential, e^x, of a column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** Exponent value.<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 2.0

**Output:** 7.38905609893

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
