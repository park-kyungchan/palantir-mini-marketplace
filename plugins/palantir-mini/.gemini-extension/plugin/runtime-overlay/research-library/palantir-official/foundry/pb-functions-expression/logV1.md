---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/logV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/logV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5f29552ea037e0db7f4d2e72fde1ceb5fa0fb85ac2d8e236dc44807ff89de589"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Logarithm"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Logarithm

> Supported in: Batch, Faster, Streaming

Calculates the natural logarithm, ln(x), of a column.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** Expression to calculate natural logarithm of.<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 10.123

**Output:** 2.3148100626166146

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
