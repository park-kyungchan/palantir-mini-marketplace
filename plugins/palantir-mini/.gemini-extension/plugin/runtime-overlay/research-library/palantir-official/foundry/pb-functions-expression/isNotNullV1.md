---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isNotNullV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isNotNullV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "52d6052e0c340815e4db561452c20969ae8cf8e5136b4f3f79c363359f644163"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is not null"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is not null

> Supported in: Batch, Faster, Streaming

Returns true if the input is not null, can optionally treat empty strings as null.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** Expression to check for null.<br>*Expression\<AnyType>*
* *optional* **Treat empty strings as null:** Whether to treat empty strings as null values.<br>*Literal\<Boolean>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** *empty string*
* **Treat empty strings as null:** true

**Output:** false

***

### Example 2: Base case

**Argument values:**

* **Expression:** *null*
* **Treat empty strings as null:** *null*

**Output:** false

***

### Example 3: Base case

**Argument values:**

* **Expression:** 1
* **Treat empty strings as null:** *null*

**Output:** true

***

### Example 4: Base case

**Argument values:**

* **Expression:** hello
* **Treat empty strings as null:** *null*

**Output:** true

***
