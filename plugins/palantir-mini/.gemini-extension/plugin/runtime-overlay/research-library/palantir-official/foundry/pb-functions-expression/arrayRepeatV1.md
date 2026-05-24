---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayRepeatV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayRepeatV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "82074e425219a515b1a888a8d6e47a6320f3364de8f4c10e4ed6f62f40d17b41"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array repeat"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array repeat

> Supported in: Batch, Faster, Streaming

Returns an array with the contents of `array` concatenated `value` times.

**Expression categories:** Array

## Declared arguments

* **Array:** Array to be repeated.<br>*Expression\<Array\<T>>*
* **Value:** Number of times to concatenate 'array'.<br>*Expression\<Integer>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Array:** \[ 1, 2 ]
* **Value:** 2

**Output:** \[ 1, 2, 1, 2 ]

***

### Example 2: Null case

**Argument values:**

* **Array:** `array`
* **Value:** `value`

| array | value | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | *null* | *null* |
| *null* | 1 | *null* |
| *null* | *null* | *null* |

***
