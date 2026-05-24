---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayFlattenV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayFlattenV2/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2e841744e90ebb3d1e0b89597468dc414e040a79c193390c8035b5c9e134b09d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array flatten"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array flatten

> Supported in: Batch, Faster, Streaming

Creates a single array from an input nested array by unioning the elements within the first level of nesting.

**Expression categories:** Array

## Declared arguments

* **Expression:** Nested array to flatten.<br>*Expression\<Array\<Array\<T>>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `array`

| array | **Output** |
| ----- | ----- |
| \[ \[ 1, 2, 3 ], \[ 4, 5, 6 ] ] | \[ 1, 2, 3, 4, 5, 6 ] |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `array`

| array | **Output** |
| ----- | ----- |
| \[ \[ \[ 1 ], \[ 2 ] ], \[ \[ 3 ], \[ 4 ] ] ] | \[ \[ 1 ], \[ 2 ], \[ 3 ], \[ 4 ] ] |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `array`

| array | **Output** |
| ----- | ----- |
| *null* | *null* |
| \[ *null*, \[ 1, 2 ] ] | \[ 1, 2 ] |

***
