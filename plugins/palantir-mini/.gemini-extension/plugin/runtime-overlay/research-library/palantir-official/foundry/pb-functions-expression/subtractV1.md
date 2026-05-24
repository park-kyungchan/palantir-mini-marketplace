---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/subtractV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/subtractV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "46558028ec55f93c871192f5fb6b4919b4821b1434953896dc81860609b5475a"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Subtract numbers"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Subtract numbers

> Supported in: Batch, Faster, Streaming

Subtract one number from another number.

**Expression categories:** Numeric

## Declared arguments

* **Left:** Left number.<br>*Expression\<Numeric>*
* **Right:** Right number.<br>*Expression\<Numeric>*

**Output type:** *Numeric*

## Examples

### Example 1: Base case

**Argument values:**

* **Left:** `col_a`
* **Right:** `col_b`

| col\_a | col\_b | **Output** |
| ----- | ----- | ----- |
| 32 | 4 | 28 |
| -5 | -3 | -2 |

***
