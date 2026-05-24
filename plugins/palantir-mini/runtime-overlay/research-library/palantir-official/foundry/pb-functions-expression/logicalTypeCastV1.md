---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/logicalTypeCastV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/logicalTypeCastV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "64515c869831dc31b160f7222bf4ee547e7b280f661e5facaa3821f86da0c767"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Logical type cast"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Logical type cast

> Supported in: Batch, Faster, Streaming

Cast expression to given logical type. Unlike the regular cast expression, this expression will not change the underlying base representation of the data, but rather enforce the constraints associated with the specified logical type, so that the output can be used as the input to downstream expressions which specifically demand an instance of that logical type.

**Expression categories:** Cast

## Declared arguments

* **Expression:** Expression to cast.<br>*Expression\<C>*
* **Logical type:** Logical type to cast to.<br>*LogicalType*
* *optional* **Default value:** Default value in case the specified expression does not fulfill the constraints of the desired logical type. If not specified, this default value will be null. If the default value itself does not fulfill the constraints of the desired logical type, the result of this expression will be null.<br>*Expression\<C>*

**Type variable bounds:** *C accepts AnyType*

**Output type:** *C*

## Examples

### Example 1: Base case

**Description:** Unsuccessful cast to natural number with default

**Argument values:**

* **Expression:** -1234
* **Logical type:** Natural number
* **Default value:** -1

**Output:** *null*

***

### Example 2: Base case

**Description:** Successful cast to natural number

**Argument values:**

* **Expression:** 1234
* **Logical type:** Natural number
* **Default value:** *null*

**Output:** 1234

***

### Example 3: Base case

**Description:** Unsuccessful cast to natural number

**Argument values:**

* **Expression:** -1234
* **Logical type:** Natural number
* **Default value:** *null*

**Output:** *null*

***

### Example 4: Base case

**Description:** Unsuccessful cast to natural number with default

**Argument values:**

* **Expression:** -1234
* **Logical type:** Natural number
* **Default value:** 1

**Output:** 1

***
