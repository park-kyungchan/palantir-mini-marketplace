---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/allArrayElementsSatisfyV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/allArrayElementsSatisfyV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fdf8531667d765b1782340098c52dd2ad923354440f87702dfdc9b59cb32336a"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > All array elements satisfy"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# All array elements satisfy

> Supported in: Batch, Streaming

Return true if the expression is true for all elements in the array.

**Expression categories:** Array

## Declared arguments

* **Array:** Array expression.<br>*Expression\<Array\<AnyType>>*
* **Boolean condition:** The expression to apply once per element of the array.<br>*Expression\<Boolean>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Array:** `miles`
* **Boolean condition:** <br>lessThan(<br> left: `element`,<br> right: `base_line`,<br>)

| miles | base\_line | **Output** |
| ----- | ----- | ----- |
| \[ 12300, 10150 ] | 20000 | true |

***

### Example 2: Base case

**Argument values:**

* **Array:** `miles`
* **Boolean condition:** <br>isNull(<br> expression: `element`,<br>)

| miles | **Output** |
| ----- | ----- |
| \[ 12300, *null* ] | false |
| \[ *null*, *null* ] | true |

***

### Example 3: Base case

**Argument values:**

* **Array:** `boolean_array`
* **Boolean condition:** `element`

| boolean\_array | **Output** |
| ----- | ----- |
| \[ true, false ] | false |
| \[ false, false ] | false |
| \[ true, true ] | true |

***

### Example 4: Null case

**Description:** Null arrays will return null outputs.

**Argument values:**

* **Array:** `miles`
* **Boolean condition:** <br>isNull(<br> expression: `element`,<br>)

| miles | **Output** |
| ----- | ----- |
| *null* | *null* |

***
