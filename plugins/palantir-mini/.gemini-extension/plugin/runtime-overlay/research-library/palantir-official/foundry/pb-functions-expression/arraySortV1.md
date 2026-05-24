---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arraySortV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arraySortV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e80e37ea7b6d5a6b648b0b8b19f6c5221d3136062acced3160d7c8e6445cc1e0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array sort"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array sort

> Supported in: Batch, Faster, Streaming

Returns a sorted array of the given input array. All null values are placed at the end of a descending array and at the front of an ascending array.

**Expression categories:** Array

## Declared arguments

* **Direction:** Choose sorting direction.<br>*Enum\<Ascending, Descending>*
* **Expression:** Array to be sorted.<br>*Expression\<Array\<T>>*

**Type variable bounds:** *T accepts ComparableType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Direction:** `ASCENDING`
* **Expression:** \[ 5, 3, 6 ]

**Output:** \[ 3, 5, 6 ]

***

### Example 2: Base case

**Argument values:**

* **Direction:** `DESCENDING`
* **Expression:** \[ 5, 3, 6 ]

**Output:** \[ 6, 5, 3 ]

***

### Example 3: Base case

**Argument values:**

* **Direction:** `ASCENDING`
* **Expression:** \[ 3, *null*, 1, 2 ]

**Output:** \[ *null*, 1, 2, 3 ]

***

### Example 4: Base case

**Argument values:**

* **Direction:** `DESCENDING`
* **Expression:** \[ 3, *null*, 1, 2 ]

**Output:** \[ 3, 2, 1, *null* ]

***

### Example 5: Null case

**Argument values:**

* **Direction:** `ASCENDING`
* **Expression:** `array`

| array | **Output** |
| ----- | ----- |
| *null* | *null* |

***
