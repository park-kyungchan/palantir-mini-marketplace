---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arraysCartesianProductV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arraysCartesianProductV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "65892ef3387e16705121a8ad0a1a970f0c0f78d3af8b9601e8fe80a0590758d9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array cartesian product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array cartesian product

> Supported in: Batch, Streaming

Compute the cartesian product of arrays.

**Expression categories:** Array

## Declared arguments

* **Expression:** Column to convert base.<br>*List\<Expression\<Array\<AnyType>>>*

**Output type:** *Array\<Struct>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** \[`first`, `second`]

| first | second | **Output** |
| ----- | ----- | ----- |
| \[ \[ {<br> **s1**: 1,<br>}, {<br> **s1**: 2,<br>} ], \[ {<br> **s1**: 3,<br>} ] ] | \[ \[ {<br> **s2**: 4,<br>}, {<br> **s2**: 5,<br>} ], \[ {<br> **s2**: 6,<br>} ] ] | \[ {<br> **first**: \[ {<br> **s1**: 1,<br>}, {<br> **s1**: 2,<br>} ],<br> \*\*secon... |

***

### Example 2: Base case

**Argument values:**

* **Expression:** \[`first`, `second`]

| first | second | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2 ] | \[ 3, 4 ] | \[ {<br> **first**: 1,<br> **second**: 3,<br>}, {<br> **first**: 1,<br> \**second*... |

***

### Example 3: Base case

**Argument values:**

* **Expression:** \[`first`, `second`, `third`]

| first | second | third | **Output** |
| ----- | ----- | ----- | ----- |
| \[ 1, 2 ] | \[ word, a ] | \[ {<br> **s1**: 1,<br>}, {<br> **s1**: 2,<br>} ] | \[ {<br> **first**: 1,<br> **second**: word,<br> **third**: {<br> **s1**: 1,<br>}... |

***

### Example 4: Null case

**Argument values:**

* **Expression:** \[`first`, `second`]

| first | second | **Output** |
| ----- | ----- | ----- |
| \[ 1, *null* ] | \[ *null*, 4 ] | \[ {<br> **first**: 1,<br> **second**: *null*,<br>}, {<br> **first**: 1,<br> \*\*se... |
| \[ 1, 2 ] | *null* | \[  ] |
| \[  ] | \[  ] | \[  ] |
| *null* | *null* | \[  ] |

***
