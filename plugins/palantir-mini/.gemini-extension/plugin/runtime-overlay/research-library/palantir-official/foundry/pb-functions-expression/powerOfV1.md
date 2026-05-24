---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/powerOfV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/powerOfV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c5664a238992a7367f5e4f7d03c978bffac363e09c29e8bf84991f4d09d04eb8"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Power of"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Power of

> Supported in: Batch, Faster, Streaming

Calculates power of expression to exponent. If any of the values is null, returns null.

**Expression categories:** Numeric

## Declared arguments

* **Exponent:** The exponent for the power of.<br>*Expression\<Numeric>*
* **Expression:** The base for the power of.<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Exponent:** 3
* **Expression:** 10

**Output:** 1000.0

***

### Example 2: Base case

**Argument values:**

* **Exponent:** 3.0
* **Expression:** 10

**Output:** 1000.0

***

### Example 3: Null case

**Description:** Whenever one of the arguments is null, the output will be null.

**Argument values:**

* **Exponent:** *null*
* **Expression:** 10

**Output:** *null*

***

### Example 4: Null case

**Description:** Whenever one of the arguments is null, the output will be null.

**Argument values:**

* **Exponent:** 3
* **Expression:** *null*

**Output:** *null*

***
