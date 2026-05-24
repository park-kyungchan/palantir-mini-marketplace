---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/orV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/orV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d61ca982588712807bc78d94b23d093d3125304e091eb522beed3d5679812e48"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Or"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Or

> Supported in: Batch, Faster, Streaming

Returns true if any of the specified conditions are true. Nulls are considered false.

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
| true | true | true |
| true | false | true |
| false | true | true |
| false | false | false |

***

### Example 2: Null case

**Argument values:**

* **Conditions:** \[*null*, true]

**Output:** true

***
