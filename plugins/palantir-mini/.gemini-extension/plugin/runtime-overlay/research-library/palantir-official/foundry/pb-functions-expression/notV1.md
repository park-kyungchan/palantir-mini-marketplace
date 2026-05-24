---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/notV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/notV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "226e46fe5c791c8be5cdc803232d5aae8bfded9df4a0417eaeb47020ae6d7d47"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Not"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Not

> Supported in: Batch, Faster, Streaming

Returns the negated boolean value of a boolean expression.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** The boolean value to negate.<br>*Expression\<Boolean>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `boolean`

| boolean | **Output** |
| ----- | ----- |
| true | false |
| false | true |

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
