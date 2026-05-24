---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arraySumV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arraySumV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "823515b4e9d2fcf4df3d58bbfc634c9500afc942015629744c7a6e83e7c59c22"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Sum of array elements"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sum of array elements

> Supported in: Batch, Faster, Streaming

Sums the elements contained within the array.

**Expression categories:** Array

## Declared arguments

* **Expression:** An array of numeric types to be summed.<br>*Expression\<Array\<T>>*
* *optional* **Treat null as zero:** If true, nulls inside the array are treated as zero, and arrays containing null can be summed. If false, the presence of a null makes the entire array null.<br>*Literal\<Boolean>*

**Type variable bounds:** *T accepts DefiniteNumeric*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** \[ 1, 2, 3 ]
* **Treat null as zero:** true

**Output:** 6

***

### Example 2: Null case

**Argument values:**

* **Expression:** \[ 1, 2, 3, *null* ]
* **Treat null as zero:** false

**Output:** *null*

***

### Example 3: Null case

**Argument values:**

* **Expression:** \[ 1, 2, 3, *null* ]
* **Treat null as zero:** true

**Output:** 6

***

### Example 4: Null case

**Argument values:**

* **Expression:** `array`
* **Treat null as zero:** true

| array | **Output** |
| ----- | ----- |
| *null* | *null* |

***
