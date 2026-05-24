---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/floorV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/floorV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "849e405bb640cfe83b053ff8759b1cc294f4f8250ae2aaf2a3b740475e013249"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Floor"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Floor

> Supported in: Batch, Faster, Streaming

Returns floor of a given fractional value.

**Expression categories:** Numeric

## Declared arguments

* **Expression:** The value to floor.<br>*Expression\<Decimal | Double | Float>*

**Output type:** *Decimal | Long*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 10.123

**Output:** 10

***

### Example 2: Null case

**Argument values:**

* **Expression:** `number`

| number | **Output** |
| ----- | ----- |
| *null* | *null* |

***
