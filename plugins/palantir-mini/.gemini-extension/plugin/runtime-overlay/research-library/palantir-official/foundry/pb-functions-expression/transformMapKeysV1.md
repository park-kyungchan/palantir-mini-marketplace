---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/transformMapKeysV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/transformMapKeysV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "24258fcb8c1ed66b5f9c7444a33ece6a7fbb53d06b7e5290a661cd1d52000c06"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Transform map keys"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transform map keys

> Supported in: Batch, Streaming

Transforms keys of a map by applying an expression to every key-value pair.

**Expression categories:** Map

## Declared arguments

* **Expression to apply:** The expression to apply once per key-value pair of the map.<br>*Expression\<K>*
* **Map:** Map expression.<br>*Expression\<Map\<AnyType, V>>*

**Type variable bounds:** *K accepts AnyType\*\*V accepts AnyType*

**Output type:** *Map\<K, V>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression to apply:** <br>stringBeforeDelimiter(<br> delimiter: -,<br> expression: `key`,<br> ignoreCase: false,<br>)
* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> MT-111 -> 2,<br> XB-134 -> 1,<br>} | {<br> MT -> 2,<br> XB -> 1,<br>} |

***

### Example 2: Base case

**Argument values:**

* **Expression to apply:** <br>cast(<br> expression: `key`,<br> type: Integer,<br>)
* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> 11 -> 1,<br> 22 -> 2,<br>} | {<br> 11 -> 1,<br> 22 -> 2,<br>} |

***

### Example 3: Base case

**Argument values:**

* **Expression to apply:** <br>cast(<br> expression: `value`,<br> type: String,<br>)
* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> 11 -> 1,<br> 22 -> 2,<br>} | {<br> 1 -> 1,<br> 2 -> 2,<br>} |

***

### Example 4: Base case

**Argument values:**

* **Expression to apply:** <br>concatStrings(<br> expressions: \[<br>stringBeforeDelimiter(<br> delimiter: -,<br> expression: `key`,<br> ignoreCase: false,<br>), `value`],<br> separator: -,<br>)
* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> MT-111 -> BB,<br> XB-134 -> AA,<br>} | {<br> MT-BB -> BB,<br> XB-AA -> AA,<br>} |

***
