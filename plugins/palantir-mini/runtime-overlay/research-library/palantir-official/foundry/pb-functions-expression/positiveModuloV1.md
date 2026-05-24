---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/positiveModuloV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/positiveModuloV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "525e65a23ed5d64ff4f1b7693d3e698b17d88120b299a5b5f552b26ae09d03a4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Positive modulo"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Positive modulo

> Supported in: Batch, Faster

Returns positive modulus of an expression.

**Expression categories:** Numeric

## Declared arguments

* **Denominator:** The divisor.<br>*Expression\<T2>*
* **Numerator:** The dividend.<br>*Expression\<T1>*

**Type variable bounds:** *T1 accepts Byte | Integer | Long | Short\*\*T2 accepts Byte | Integer | Long | Short*

**Output type:** *T1*

## Examples

### Example 1: Base case

**Argument values:**

* **Denominator:** 3
* **Numerator:** 10

**Output:** 1

***

### Example 2: Base case

**Argument values:**

* **Denominator:** -3
* **Numerator:** -10

**Output:** -1

***

### Example 3: Base case

**Argument values:**

* **Denominator:** -3
* **Numerator:** 10

**Output:** 1

***

### Example 4: Base case

**Argument values:**

* **Denominator:** 3
* **Numerator:** -10

**Output:** 2

***

### Example 5: Null case

**Argument values:**

* **Denominator:** *null*
* **Numerator:** 10

**Output:** *null*

***

### Example 6: Null case

**Argument values:**

* **Denominator:** 3
* **Numerator:** *null*

**Output:** *null*

***

### Example 7: Edge case

**Argument values:**

* **Denominator:** 0
* **Numerator:** 10

**Output:** *null*

***

### Example 8: Edge case

**Argument values:**

* **Denominator:** 3
* **Numerator:** 0

**Output:** 0

***
