---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arraysHaveIntersectionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arraysHaveIntersectionV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ba0fe8f275819c2e052b43a88e7c88f6f460fb5557d82d4fa09683115518e5ee"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Arrays have intersection"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arrays have intersection

> Supported in: Batch, Faster, Streaming

Checks if given arrays have at least one shared element.

**Expression categories:** Array, Boolean

## Declared arguments

* **Expressions:** List of arrays to check.<br>*List\<Expression\<Array\<T>>>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 3, 4 ]]

**Output:** true

***

### Example 2: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2 ], \[ 3, 4 ]]

**Output:** false

***

### Example 3: Base case

**Argument values:**

* **Expressions:** \[\[ 1, 2, 3 ], \[ 3, 4 ], \[ 2, 3 ]]

**Output:** true

***

### Example 4: Null case

**Argument values:**

* **Expressions:** \[`first_array`, `second_array`]

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | *null* | false |
| *null* | *null* | false |

***
