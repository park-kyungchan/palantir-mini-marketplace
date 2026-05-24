---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isNullV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isNullV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6221b62df55b6f98d46512c85e7e0bf114600258c72e2ccf9835852128227d52"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is null"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is null

> Supported in: Batch, Faster, Streaming

Returns true if the input is null, can optionally treat empty strings as null.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** The expression to check for null values.<br>*Expression\<AnyType>*
* *optional* **Treat empty strings as null:** Whether to treat empty strings as null values.<br>*Literal\<Boolean>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** *empty string*
* **Treat empty strings as null:** true

**Output:** true

***

### Example 2: Base case

**Argument values:**

* **Expression:** hello
* **Treat empty strings as null:** *null*

**Output:** false

***

### Example 3: Base case

**Argument values:**

* **Expression:** 1
* **Treat empty strings as null:** *null*

**Output:** false

***

### Example 4: Base case

**Argument values:**

* **Expression:** *null*
* **Treat empty strings as null:** *null*

**Output:** true

***
