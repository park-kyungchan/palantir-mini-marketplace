---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayAddV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayAddV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4a734eedfa7a5d9e2a6903a2f0e7dc6ee735a6344167fffbee1308fb6f3e1c5b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array add"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array add

> Supported in: Batch, Faster, Streaming

Adds a value to the array at a specified index.

**Expression categories:** Array

## Declared arguments

* **Array:** The array to add an element to.<br>*Expression\<Array\<T>>*
* **Index:** Position where the new element should be inserted into the array. First element is at position 1.<br>*Expression\<Integer>*
* **Value:** The element to add to the array.<br>*Expression\<T>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Array:** `numbers`
* **Index:** 1
* **Value:** 1

| numbers | **Output** |
| ----- | ----- |
| \[ 3, 5 ] | \[ 1, 3, 5 ] |
| \[ 2 ] | \[ 1, 2 ] |
| \[  ] | \[ 1 ] |

***

### Example 2: Null case

**Argument values:**

* **Array:** `numbers`
* **Index:** `index`
* **Value:** `value`

| numbers | value | index | **Output** |
| ----- | ----- | ----- | ----- |
| *null* | 1 | 1 | *null* |
| \[ 1 ] | *null* | 1 | \[ *null*, 1 ] |
| \[ 1 ] | 1 | *null* | \[ 1 ] |

***

### Example 3: Edge case

**Description:** Index values greater than the list length append to the array.

**Argument values:**

* **Array:** `numbers`
* **Index:** `index`
* **Value:** `value`

| numbers | value | index | **Output** |
| ----- | ----- | ----- | ----- |
| \[ 1, 2 ] | 3 | 3 | \[ 1, 2, 3 ] |
| \[ 1 ] | 2 | 3 | \[ 1, *null*, 2 ] |
| \[  ] | 1 | 3 | \[ *null*, *null*, 1 ] |
| \[ 3, 5 ] | 1 | 10 | \[ 3, 5, *null*, *null*, *null*, *null*, *null*, *null*, *null*, 1 ] |

***

### Example 4: Edge case

**Description:** Negative values for the index count back from the end of the array.

**Argument values:**

* **Array:** `numbers`
* **Index:** `index`
* **Value:** `value`

| numbers | value | index | **Output** |
| ----- | ----- | ----- | ----- |
| \[ 1, 3 ] | 2 | -1 | \[ 1, 2, 3 ] |
| \[ 2, 3 ] | 1 | -2 | \[ 1, 2, 3 ] |
| \[ 2, 3 ] | 1 | -3 | \[ 1, *null*, 2, 3 ] |
| \[ 2 ] | 1 | -1 | \[ 1, 2 ] |
| \[ 2 ] | 1 | -2 | \[ 1, *null*, 2 ] |
| \[ 2 ] | 1 | -3 | \[ 1, *null*, *null*, 2 ] |
| \[  ] | 1 | -1 | \[ 1, *null* ] |
| \[  ] | 1 | -2 | \[ 1, *null*, *null* ] |
| \[  ] | 1 | -3 | \[ 1, *null*, *null*, *null* ] |

***
