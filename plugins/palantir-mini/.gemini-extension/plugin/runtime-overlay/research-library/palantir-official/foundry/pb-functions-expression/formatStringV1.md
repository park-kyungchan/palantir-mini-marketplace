---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/formatStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/formatStringV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "151fb8c5544656fa85141ae1c560cad8a1e8db5337fff55103a9480f90107038"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Format string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Format string

> Supported in: Batch, Streaming

Formats string printf style.

**Expression categories:** String

## Declared arguments

* **Format arguments:** List of args to insert into format string.<br>*List\<Expression\<Boolean | Byte | Date | Decimal | Double | Float | Integer | Long | Short | String | Timestamp>>*
* **Format string:** String to be formatted.<br>*Literal\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Format arguments:** \[`argument1`, `argument2`]
* **Format string:** Hello %s, my name is %s

| argument1 | argument2 | **Output** |
| ----- | ----- | ----- |
| Alice | Bob | Hello Alice, my name is Bob |
| Jane | John | Hello Jane, my name is John |

***

### Example 2: Base case

**Description:** Formats an integer.

**Argument values:**

* **Format arguments:** \[4]
* **Format string:** number = %d

**Output:** number = 4

***

### Example 3: Base case

**Description:** Formats a double with a sign and 4 decimal places.

**Argument values:**

* **Format arguments:** \[2.718281828459045]
* **Format string:** e = %+.4f

**Output:** e = +2.7183

***

### Example 4: Null case

**Argument values:**

* **Format arguments:** \[`argument1`, `argument2`]
* **Format string:** Hello %s, my name is %s

| argument1 | argument2 | **Output** |
| ----- | ----- | ----- |
| *null* | Bob | Hello null, my name is Bob |
| Alice | *null* | Hello Alice, my name is null |
| *null* | *null* | Hello null, my name is null |

***
