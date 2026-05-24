---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isInV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isInV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0aedd39e67893e9e0bd6f142bc4144717300247815f3d144366c268855e451da"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is in"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is in

> Supported in: Batch, Faster, Streaming

Returns true if the list contains the value.

**Expression categories:** Boolean

## Declared arguments

* **Contains:** The list to search within.<br>*List\<Expression\<T>>*
* **Value:** The value to look for.<br>*Expression\<T>*

**Type variable bounds:** *T accepts ComparableType*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Description:** Elements can be arrays.

**Argument values:**

* **Contains:** \[`one`, `two`]
* **Value:** `value`

| one | two | value | **Output** |
| ----- | ----- | ----- | ----- |
| \[ 1 ] | \[ 2 ] | \[ 1 ] | true |
| \[ 1, 2 ] | \[ 2 ] | \[ 1 ] | false |

***

### Example 2: Base case

**Description:** You can check if the list contains the value.

**Argument values:**

* **Contains:** \[AWE-112, BRR-123]
* **Value:** `value`

| value | **Output** |
| ----- | ----- |
| BRR-123 | true |
| ABC-543 | false |

***

### Example 3: Base case

**Description:** Elements can be structs.

**Argument values:**

* **Contains:** \[`one`, `two`]
* **Value:** `value`

| one | two | value | **Output** |
| ----- | ----- | ----- | ----- |
| {<br> **part**: AWE-112,<br>} | {<br> **part**: BRR-123,<br>} | {<br> **part**: AWE-112,<br>} | true |
| {<br> **part**: CSE-122,<br>} | {<br> **part**: BRR-123,<br>} | {<br> **part**: AWE-112,<br>} | false |

***

### Example 4: Null case

**Description:** You can check for null.

**Argument values:**

* **Contains:** \[`one`, `two`, `three`]
* **Value:** `value`

| one | two | three | value | **Output** |
| ----- | ----- | ----- | ----- | ----- |
| 1 | 2 | 3 | *null* | false |
| *null* | *null* | *null* | 1 | false |
| 1 | 2 | *null* | *null* | true |

***
