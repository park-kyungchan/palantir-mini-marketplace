---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/reduceArrayElementsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/reduceArrayElementsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f461244538bbe42c475245d3f4c311e9984a9496bb6cedeb46f9fba83e5af429"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Reduce array elements"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Reduce array elements

> Supported in: Batch, Streaming

Reduces array elements using an expression.

**Expression categories:** Array

## Declared arguments

* **Array:** Array to reduce.<br>*Expression\<Array\<Array\<Boolean | Byte | Date | Double | Float | Integer | Long | Map\<AnyType, AnyType> | Short | String | Timestamp> | Boolean | Byte | Date | Double | Float | Integer | Long | Map\<AnyType, AnyType> | Short | String | Timestamp>>*
* **Expression to reduce:** The expression to apply once per element of the array.<br>*Expression\<T>*
* **Initial value:** This is the start value used to initialize the accumulator, if the array has a length of 0, this value will be returned.<br>*Expression\<T>*

**Type variable bounds:** *T accepts Array\<Boolean | Byte | Date | Double | Float | Integer | Long | Map\<AnyType, AnyType> | Short | String | Timestamp> | Boolean | Byte | Date | Double | Float | Integer | Long | Map\<AnyType, AnyType> | Short | String | Timestamp*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Array:** `miles`
* **Expression to reduce:** <br>add(<br> expressions: \[`accumulator`, `element`],<br>)
* **Initial value:** 0

| miles | **Output** |
| ----- | ----- |
| \[ 12300, 12342 ] | 24642 |

***

### Example 2: Base case

**Description:** Return the first non null within the array.

**Argument values:**

* **Array:** `miles`
* **Expression to reduce:** <br>firstNonNull(<br> expressions: \[`accumulator`, `element`],<br>)
* **Initial value:** `init`

| miles | init | **Output** |
| ----- | ----- | ----- |
| \[ *null*, *null*, 12300, 12111 ] | *null* | 12300 |

***

### Example 3: Base case

**Argument values:**

* **Array:** `miles`
* **Expression to reduce:** <br>concatStrings(<br> expressions: \[`accumulator`, <br>cast(<br> expression: `element`,<br> type: String,<br>)],<br> separator: -,<br>)
* **Initial value:** *empty string*

| miles | **Output** |
| ----- | ----- |
| \[ 12300, 12342 ] | -12300-12342 |

***

### Example 4: Null case

**Description:** Null arrays will return null outputs.

**Argument values:**

* **Array:** `miles`
* **Expression to reduce:** <br>firstNonNull(<br> expressions: \[`accumulator`, `element`],<br>)
* **Initial value:** `init`

| miles | init | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |

***

### Example 5: Edge case

**Description:** Empty array will return the initial value.

**Argument values:**

* **Array:** `miles`
* **Expression to reduce:** <br>add(<br> expressions: \[`accumulator`, `element`],<br>)
* **Initial value:** 0

| miles | **Output** |
| ----- | ----- |
| \[  ] | 0 |

***
