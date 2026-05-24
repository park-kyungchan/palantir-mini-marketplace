---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/convertBaseV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/convertBaseV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a6c29e5af8beb0202932086eddfc72f06c26703ba12707b42aa93422aa99cd29"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert base"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert base

> Supported in: Batch, Streaming

Convert a number (or it string representation) from one base to another.

**Expression categories:** Binary, Cast, Numeric

## Declared arguments

* **Expression:** Column to convert base.<br>*Expression\<Byte | Integer | Long | Short | String>*
* **From base:** Convert from base.<br>*Literal\<Integer>*
* **To base:** Convert to base.<br>*Literal\<Integer>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 4A801
* **From base:** 16
* **To base:** 10

**Output:** 305153

***

### Example 2: Base case

**Argument values:**

* **Expression:** 8
* **From base:** 10
* **To base:** 2

**Output:** 1000

***

### Example 3: Null case

**Argument values:**

* **Expression:** `input`
* **From base:** 10
* **To base:** 16

| input | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Edge case

**Description:** When input is made of characters that are outside the base of the given 'from base', only the leading characters up to the first out of base character is considered.

**Argument values:**

* **Expression:** `input`
* **From base:** 2
* **To base:** 10

| input | **Output** |
| ----- | ----- |
| 123 | 1 |
| 213 | 0 |
| 1032 | 2 |

***
