---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayDistinctV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayDistinctV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3f18f4c6f73a857f8b917408aa831b0871a043eb7986a181482f31e6c4862bd7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array distinct"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array distinct

> Supported in: Batch, Faster, Streaming

Removes duplicates and returns distinct values from the array.

**Expression categories:** Array

## Declared arguments

* **Expression:** Input array from which to remove duplicates.<br>*Expression\<Array\<T>>*

**Type variable bounds:** *T accepts ComparableType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** \[ 1, 1, 2, 3 ]

**Output:** \[ 1, 2, 3 ]

***

### Example 2: Null case

**Argument values:**

* **Expression:** `array`

| array | **Output** |
| ----- | ----- |
| *null* | *null* |

***
