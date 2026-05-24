---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/moduloV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/moduloV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "531f9296e793a4a8d4c910a883e94d0489596273fa11eb3455c8b34a0401abf0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Modulo"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Modulo

> Supported in: Batch, Faster, Streaming

Returns modulus of an expression.

**Expression categories:** Numeric

## Declared arguments

* **Denominator:** The divisor for the modulus operation.<br>*Expression\<DefiniteNumeric>*
* **Numerator:** The value to compute the modulus of.<br>*Expression\<DefiniteNumeric>*

**Output type:** *DefiniteNumeric*

## Examples

### Example 1: Base case

**Argument values:**

* **Denominator:** 4
* **Numerator:** 10.123

**Output:** 2.123

***

### Example 2: Null case

**Argument values:**

* **Denominator:** 2
* **Numerator:** *null*

**Output:** *null*

***
