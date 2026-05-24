---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/stringContainsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/stringContainsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "51cfc9ce488b18564238090a118980091127260bb988e6aeccd74117d4af12e5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > String contains"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# String contains

> Supported in: Batch, Faster, Streaming

**Expression categories:** Boolean, String

## Declared arguments

* **Expression:** Expression to compare.<br>*Expression\<String>*
* **Ignore case:** Boolean to decide if comparison should be case-sensitive or not.<br>*Literal\<Boolean>*
* **Value:** Value to compare against.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** ... Hello world
* **Ignore case:** false
* **Value:** hello

**Output:** false

***

### Example 2: Base case

**Argument values:**

* **Expression:** ... Hello world
* **Ignore case:** false
* **Value:** Hello

**Output:** true

***

### Example 3: Base case

**Argument values:**

* **Expression:** ... Hello world
* **Ignore case:** true
* **Value:** hello

**Output:** true

***

### Example 4: Null case

**Argument values:**

* **Expression:** *null*
* **Ignore case:** false
* **Value:** *null*

**Output:** false

***

### Example 5: Null case

**Argument values:**

* **Expression:** *null*
* **Ignore case:** false
* **Value:** Hello

**Output:** false

***

### Example 6: Null case

**Argument values:**

* **Expression:** hello world
* **Ignore case:** false
* **Value:** *null*

**Output:** false

***
