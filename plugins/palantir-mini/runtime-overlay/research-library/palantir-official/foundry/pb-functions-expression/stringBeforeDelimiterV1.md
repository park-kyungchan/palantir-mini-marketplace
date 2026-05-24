---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/stringBeforeDelimiterV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/stringBeforeDelimiterV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f611ec69bc6e4d29c5e96e0193d4b9701b45909ec180701d67695a2faeba3871"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > String before delimiter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# String before delimiter

> Supported in: Batch, Faster, Streaming

Extract the string before the first delimiter. Return the full string if no matches are found.

**Expression categories:** String

## Declared arguments

* **Delimiter:** Regex expression of delimiter.<br>*Regex*
* **Expression:** *no description*<br>*Expression\<String>*
* **Ignore case:** *no description*<br>*Literal\<Boolean>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Delimiter:** hello
* **Expression:** ... Hello world
* **Ignore case:** false

**Output:** ... Hello world

***

### Example 2: Base case

**Argument values:**

* **Delimiter:** Hello
* **Expression:** ... Hello world
* **Ignore case:** false

**Output:** ...

***

### Example 3: Base case

**Argument values:**

* **Delimiter:** hello
* **Expression:** ... Hello world
* **Ignore case:** true

**Output:** ...

***

### Example 4: Null case

**Argument values:**

* **Delimiter:** Hello
* **Expression:** *null*
* **Ignore case:** false

**Output:** *null*

***
