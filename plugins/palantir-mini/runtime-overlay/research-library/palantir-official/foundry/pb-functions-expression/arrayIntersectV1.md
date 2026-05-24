---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayIntersectV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayIntersectV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fc3706af8d0a0c4b5a24b5de99815bf7357c0ff50de795c2955bdf2ad977ff47"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array intersect"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array intersect

> Supported in: Batch, Faster, Streaming

Removes duplicates and intersects a list of arrays.

**Expression categories:** Array

## Declared arguments

* **Expressions:** A list of arrays to intersect.<br>*List\<Expression\<Array\<T>>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 3, 4 ]]

**Output:** \[ 3 ]

***

### Example 2: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 3, 4 ], \[ 2, 3 ]]

**Output:** \[ 3 ]

***

### Example 3: Base case

**Description:** Duplicates are removed.

**Argument values:**

* **Expressions:** \[\[ 1, 1 ], \[ 1 ]]

**Output:** \[ 1 ]

***

### Example 4: Null case

**Argument values:**

* **Expressions:** \[`first_array`, `second_array`]

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | *null* | \[  ] |
| *null* | *null* | \[  ] |

***
