---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/leftStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/leftStringV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "368e0560baeec6a71209a3204a940777096a8332aebea2f863447420f7b5dffe"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Left of string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Left of string

> Supported in: Batch, Faster, Streaming

Extract left hand side of a string based on index.

**Expression categories:** String

## Declared arguments

* **Expression:** String input expression.<br>*Expression\<String>*
* **Length:** The number of characters to take from the left of the string.<br>*Expression\<Integer>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** Hello world!
* **Length:** 5

**Output:** Hello

***

### Example 2: Null case

**Argument values:**

* **Expression:** `string`
* **Length:** `length`

| string | length | **Output** |
| ----- | ----- | ----- |
| Hello world! | -10 | *empty string* |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `string`
* **Length:** `length`

| string | length | **Output** |
| ----- | ----- | ----- |
| *null* | 1 | *null* |
| Hello world! | *null* | *null* |
| *null* | *null* | *null* |

***

### Example 4: Edge case

**Description:** Length greater than the string length will return the full string.

**Argument values:**

* **Expression:** Hello world!
* **Length:** 15

**Output:** Hello world!

***
