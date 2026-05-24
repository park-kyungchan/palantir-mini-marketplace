---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/ceilV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/ceilV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "555ced63de74d453f16d68b94e7f93f6be7b147299c6fe25d00ad1ee0c744791"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Ceil"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ceil

> Supported in: Batch, Faster, Streaming

Returns ceil of a given fractional value.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** Fractional input value.<br>*Expression\<Decimal | Double | Float>*

**Output type:** *Decimal | Long*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 10.123

**Output:** 11

***

### Example 2: Null case

**Argument values:**

* **Expression:** `number`

| number | **Output** |
| ----- | ----- |
| *null* | *null* |

***
