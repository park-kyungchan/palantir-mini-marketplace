---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arraysZipV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arraysZipV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3db3dcff16794157678e85fa83097f0b3b4af1c120dda63d60fc19de0e4a15a3"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Arrays zip"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arrays zip

> Supported in: Batch, Faster, Streaming

Zips a list of given arrays into a merged array of structs in which the n-th struct contains all n-th values of input arrays.

**Expression categories:** Array

## Declared arguments

* **Expressions:** A list of arrays to zip.<br>*List\<Expression\<Array\<AnyType>>>*

**Output type:** *Array\<Struct>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[`first_array`, `second_array`]

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | \[ 4, 5, 6 ] | \[ {<br> **first\_array**: 1,<br> **second\_array**: 4,<br>}, {<br> **first\_array**: 2,<... |

***

### Example 2: Null case

**Argument values:**

* **Expressions:** \[`first_array`, `second_array`]

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | *null* | \[ {<br> **first\_array**: 1,<br> **second\_array**: *null*,<br>}, {<br> **first\_array**... |
| *null* | *null* | \[  ] |
| \[  ] | \[  ] | \[  ] |

***

### Example 3: Edge case

**Description:** Longest length array is used.

**Argument values:**

* **Expressions:** \[`first_array`, `second_array`]

| first\_array | second\_array | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | \[ 4, 5 ] | \[ {<br> **first\_array**: 1,<br> **second\_array**: 4,<br>}, {<br> **first\_array**: 2,<... |

***
