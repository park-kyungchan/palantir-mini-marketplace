---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/rightPadV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/rightPadV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5dd4aa7b95ea7eed15135b4debfaf374a3525c7c77a4251233bb77cc6eb40957"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Right pad string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Right pad string

> Supported in: Batch, Faster, Streaming

Right-pad the string column to width of length with pad. If the length of the string is greater than the length provided, it will be trimmed.

**Expression categories:** String

## Declared arguments

* **Expression:** *no description*<br>*Expression\<String>*
* **Length:** *no description*<br>*Expression\<Integer>*
* **Pad:** *no description*<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** Hello world!
* **Length:** 15
* **Pad:** \*

**Output:** Hello world!\*\*\*

***

### Example 2: Null case

**Argument values:**

* **Expression:** `String`
* **Length:** `Length`
* **Pad:** `Pad`

| String | Length | Pad | **Output** |
| ----- | ----- | ----- | ----- |
| *null* | 15 | \* | *null* |
| Hello world! | *null* | \* | *empty string* |
| Hello, world! | 15 | *null* | Hello, world! |
| *null* | *null* | *null* | *null* |

***

### Example 3: Edge case

**Description:** Length less than the string will truncate the string.

**Argument values:**

* **Expression:** Hello world!
* **Length:** 5
* **Pad:** \*

**Output:** Hello

***

### Example 4: Edge case

**Description:** Length of 0 will remove the string.

**Argument values:**

* **Expression:** Hello world!
* **Length:** 0
* **Pad:** \*

**Output:** *empty string*

***
