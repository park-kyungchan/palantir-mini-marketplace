---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/endsWithV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/endsWithV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "67c3d8693b93b872a50006a294ad6b1f9bf91942c13c74aa526da2abafb84b37"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Ends with"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ends with

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

* **Expression:** Hello World
* **Ignore case:** false
* **Value:** world

**Output:** false

***

### Example 2: Base case

**Argument values:**

* **Expression:** Hello World
* **Ignore case:** false
* **Value:** World

**Output:** true

***

### Example 3: Base case

**Argument values:**

* **Expression:** Hello World
* **Ignore case:** true
* **Value:** world

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
* **Value:** World

**Output:** false

***

### Example 6: Null case

**Argument values:**

* **Expression:** Hello World
* **Ignore case:** false
* **Value:** *null*

**Output:** false

***
