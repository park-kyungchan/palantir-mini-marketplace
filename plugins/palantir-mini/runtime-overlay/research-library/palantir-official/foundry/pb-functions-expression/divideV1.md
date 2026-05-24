---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/divideV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/divideV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c468ca203ff5cfce2b34ffdefa1d9dd4ea4e86d626f428e677fda0fad1de7bfb"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Divide numbers"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Divide numbers

> Supported in: Batch, Faster, Streaming

Divide one number by another number.

**Expression categories:** Numeric

## Declared arguments

* **Left:** Numerator.<br>*Expression\<Numeric>*
* **Right:** Denominator.<br>*Expression\<Numeric>*

**Output type:** *Decimal | Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Left:** `col_a`
* **Right:** `col_b`

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| 4 | 2 | 2.0 |
| 11 | 2 | 5.5 |

***
