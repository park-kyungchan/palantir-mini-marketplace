---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/bitShiftLeftV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/bitShiftLeftV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "169d8a372238fc995ea69733d1b08d0b88c6d538cc7e85b74e9b9a8e8ed17950"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Bit shift left"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Bit shift left

> Supported in: Batch, Streaming

Shift the given value a number of bits left.

**Expression categories:** Binary

## Declared arguments

* **Expression:** The value to shift left.<br>*Expression\<E>*
* **Number of bits:** The number of bits to shift left by.<br>*Literal\<Integer>*

**Type variable bounds:** *E accepts Byte | Integer | Long | Short*

**Output type:** *E*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 1
* **Number of bits:** 1

**Output:** 2

***

### Example 2: Base case

**Argument values:**

* **Expression:** 12345678910
* **Number of bits:** 5

**Output:** 395061725120

***

### Example 3: Null case

**Argument values:**

* **Expression:** `number`
* **Number of bits:** 1

| number | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Edge case

**Argument values:**

* **Expression:** -2147483648
* **Number of bits:** 100

**Output:** 0

***

### Example 5: Edge case

**Argument values:**

* **Expression:** 2147483647
* **Number of bits:** 10

**Output:** -1024

***

### Example 6: Edge case

**Argument values:**

* **Expression:** 1
* **Number of bits:** -10

**Output:** 4194304

***
