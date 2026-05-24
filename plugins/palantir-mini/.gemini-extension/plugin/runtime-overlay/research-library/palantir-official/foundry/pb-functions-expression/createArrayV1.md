---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/createArrayV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/createArrayV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "38ae8dc669cb6c485ad2c9aa2a5f2bb2c62370ca6fd22c01e98736d1444b88e7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create array

> Supported in: Batch, Faster, Streaming

Creates an array from the columns provided.

**Expression categories:** Array

## Declared arguments

* **Expressions:** A list of expressions to create arrays from.<br>*List\<Expression\<T>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[1, 2, 3]

**Output:** \[ 1, 2, 3 ]

***

### Example 2: Base case

**Argument values:**

* **Expressions:** \[\[ 1 ], \[ 2 ]]

**Output:** \[ \[ 1 ], \[ 2 ] ]

***

### Example 3: Null case

**Argument values:**

* **Expressions:** \[1, *null*, 3]

**Output:** \[ 1, *null*, 3 ]

***
