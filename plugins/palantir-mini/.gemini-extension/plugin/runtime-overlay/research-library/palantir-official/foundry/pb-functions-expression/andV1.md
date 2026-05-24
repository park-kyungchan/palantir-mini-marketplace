---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/andV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/andV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "658a2d090d4ccb20ebd91f490eef566bb08f9caa45e04254d9bb9d28b9e226d6"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > And"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# And

> Supported in: Batch, Faster, Streaming

Returns true if all of the specified conditions are true. Nulls are considered false.

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
| true | false | false |
| false | true | false |
| false | false | false |

***

### Example 2: Null case

**Argument values:**

* **Conditions:** \[*null*, true]

**Output:** false

***
