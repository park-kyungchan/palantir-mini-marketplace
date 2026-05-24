---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/firstNonNullV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/firstNonNullV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1761cb52c53c4d4703ba077759e0bd9a1845770fdd8f847b0298593eb59570d6"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > First non null value (coalesce)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# First non null value (coalesce)

> Supported in: Batch, Faster, Streaming

Picks first non null value of the inputs. Known as coalesce in sql.

**Expression categories:** Data preparation

## Declared arguments

* **Expressions:** The first non null values of these expressions will be returned.<br>*List\<Expression\<T>>*
* *optional* **Treat empty strings as null:** Treat all empty strings as null values.<br>*Literal\<Boolean>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[`tail_number`, `airline`]
* **Treat empty strings as null:** *null*

| tail\_number | airline | **Output** |
| ----- | ----- | ----- |
| XB-123 | *null* | XB-123 |
| *null* | MT | MT |

***

### Example 2: Base case

**Argument values:**

* **Expressions:** \[`tail_number`, `airline`]
* **Treat empty strings as null:** true

| tail\_number | airline | **Output** |
| ----- | ----- | ----- |
| XB-123 | *null* | XB-123 |
| *empty string* | MT | MT |

***

### Example 3: Null case

**Argument values:**

* **Expressions:** \[`tail_number`, `airline`]
* **Treat empty strings as null:** *null*

| tail\_number | airline | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |

***
