---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayConcatV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayConcatV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "be0cbe99019e5ed238f3fd38a6e47da7658045fb28f84398a51f8956218c18a1"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array concat"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array concat

> Supported in: Batch, Faster, Streaming

Concatenates the provided arrays into a single array, without de-duplication.

**Expression categories:** Array

## Declared arguments

* **Expressions:** A list of arrays to concatenate.<br>*List\<Expression\<Array\<T>>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 4, 5 ]]

**Output:** \[ 1, 2, 3, 4, 5 ]

***

### Example 2: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 3, 4 ], \[ 4, 5 ]]

**Output:** \[ 1, 2, 3, 3, 4, 4, 5 ]

***

### Example 3: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 3, 4 ]]

**Output:** \[ 1, 2, 3, 3, 4 ]

***

### Example 4: Null case

**Argument values:**

* **Expressions:** \[`first_array`, `second_array`]

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2 ] | \[ 3, 4 ] | \[ 1, 2, 3, 4 ] |
| \[ 1, 2, 3 ] | *null* | \[ 1, 2, 3 ] |
| *null* | *null* | \[  ] |

***
