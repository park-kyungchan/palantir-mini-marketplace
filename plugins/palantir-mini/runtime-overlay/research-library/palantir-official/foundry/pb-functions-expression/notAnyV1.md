---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/notAnyV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/notAnyV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7176ca3ddd1866db752a5639e03c1f8e72799b2a46e4a84fda66811a3a46b65c"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Not any"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Not any

> Supported in: Batch, Streaming

Returns true only if all of the specified conditions are false. Nulls are considered false.

**Expression categories:** Boolean

## Declared arguments

* **Conditions:** List of conditions from which the output is calculated.<br>*List\<Expression\<Boolean>>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Conditions:** \[`left_boolean`, `right_boolean`]

| left\_boolean | right\_boolean | **Output** |
| ----- | ----- | ----- |
| true | true | false |
| true | false | false |
| false | true | false |
| false | false | true |

***

### Example 2: Null case

**Argument values:**

* **Conditions:** \[*null*, *null*]

**Output:** true

***

### Example 3: Null case

**Argument values:**

* **Conditions:** \[*null*, true]

**Output:** false

***
