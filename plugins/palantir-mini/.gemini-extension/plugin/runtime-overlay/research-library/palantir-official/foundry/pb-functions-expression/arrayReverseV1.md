---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayReverseV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayReverseV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5920e05833ddf585b369ea7b17dbbfeb3236ab5fb4f839c0e9fc6f40d96af3c4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array reverse"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array reverse

> Supported in: Batch, Faster, Streaming

Reverse the order of elements in 'array'.

**Expression categories:** Array

## Declared arguments

* **Expression:** Array to be reversed.<br>*Expression\<Array\<T>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** \[ 1, 2, 3 ]

**Output:** \[ 3, 2, 1 ]

***

### Example 2: Null case

**Argument values:**

* **Expression:** `array`

| array | **Output** |
| ----- | ----- |
| *null* | *null* |
| \[ 1, *null* ] | \[ *null*, 1 ] |

***
