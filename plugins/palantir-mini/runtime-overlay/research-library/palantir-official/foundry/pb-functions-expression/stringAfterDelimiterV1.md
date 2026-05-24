---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/stringAfterDelimiterV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/stringAfterDelimiterV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "53718b6c6575e65d0eb624c5e3bc9364b08b17dcdc9d6861ea289e3fbeebf578"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > String after delimiter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# String after delimiter

> Supported in: Batch, Faster, Streaming

Extract the string after the first delimiter. Return full string if no matches are found.

**Expression categories:** String

## Declared arguments

* **Delimiter:** Regex expression of delimiter.<br>*Regex*
* **Expression:** Input to perform regex operation on.<br>*Expression\<String>*
* **Ignore case:** Should the regex ignore case.<br>*Literal\<Boolean>*

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

**Output:** world

***

### Example 3: Base case

**Argument values:**

* **Delimiter:** hello
* **Expression:** ... Hello world
* **Ignore case:** true

**Output:** world

***

### Example 4: Null case

**Argument values:**

* **Delimiter:** Hello
* **Expression:** *null*
* **Ignore case:** false

**Output:** *null*

***

### Example 5: Edge case

**Argument values:**

* **Delimiter:** Hello
* **Expression:** ... Hello Hello world
* **Ignore case:** false

**Output:** Hello world

***
