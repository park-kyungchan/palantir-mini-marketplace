---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/rightStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/rightStringV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "669eb7981fd8357c429e9a91b878c08d9db3a4e2e2368a96fbf5d25b1b05e8b4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Right of string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Right of string

> Supported in: Batch, Faster, Streaming

Extract right hand side of a string based on index.

**Expression categories:** String

## Declared arguments

* **Expression:** *no description*<br>*Expression\<String>*
* **Length:** The number of characters to take from the right of the string.<br>*Expression\<Integer>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** Hello world!
* **Length:** 6

**Output:** world!

***

### Example 2: Null case

**Argument values:**

* **Expression:** `String`
* **Length:** `Length`

| String | Length | **Output** |
| ----- | ----- | ----- |
| *null* | 1 | *null* |
| Hello world! | *null* | *null* |
| *null* | *null* | *null* |

***

### Example 3: Edge case

**Description:** Length greater than the string length will return the full string.

**Argument values:**

* **Expression:** Hello world!
* **Length:** 15

**Output:** Hello world!

***
