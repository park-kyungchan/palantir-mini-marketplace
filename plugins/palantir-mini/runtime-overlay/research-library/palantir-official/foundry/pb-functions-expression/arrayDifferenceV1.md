---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayDifferenceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayDifferenceV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "55e908f4056df2f90324e160f66946acdd425944eff38d87e6643ba876af51aa"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array difference"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array difference

> Supported in: Batch, Faster, Streaming

Returns all unique elements in the `left` array that are not in the `right` array.

**Expression categories:** Array

## Declared arguments

* **Left array:** *no description*<br>*Expression\<Array\<T>>*
* **Right array:** *no description*<br>*Expression\<Array\<T>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Left array:** \[ 1, 2, 3 ]
* **Right array:** \[ 2, 3, 4 ]

**Output:** \[ 1 ]

***

### Example 2: Null case

**Argument values:**

* **Left array:** `first_array`
* **Right array:** `second_array`

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | *null* | \[ 1, 2, 3 ] |
| *null* | \[ 1, 2, 3 ] | *null* |
| *null* | *null* | *null* |

***

### Example 3: Edge case

**Description:** Duplicates in the left array will be removed.

**Argument values:**

* **Left array:** \[ 1, 1, 2, 3 ]
* **Right array:** \[ 2, 3, 4 ]

**Output:** \[ 1 ]

***
