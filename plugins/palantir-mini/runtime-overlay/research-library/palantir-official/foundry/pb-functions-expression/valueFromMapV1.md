---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/valueFromMapV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/valueFromMapV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "721fa86c80f3d43c3bc03cbedbbead21c0dfe7fae743b5a0b7a644ea9f4ab798"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Value from map"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Value from map

> Supported in: Batch, Faster, Streaming

Get a value from a map using a key.

**Expression categories:** Map

## Declared arguments

* **Key:** Key expression.<br>*Expression\<K>*
* **Map:** Map expression.<br>*Expression\<Map\<K, V>>*

**Type variable bounds:** *K accepts ComparableType\*\*V accepts AnyType*

**Output type:** *V*

## Examples

### Example 1: Base case

**Argument values:**

* **Key:** \[ 1 ]
* **Map:** {<br> \[ 1 ] -> Foo,<br>}

**Output:** Foo

***

### Example 2: Base case

**Argument values:**

* **Key:** Bar
* **Map:** {<br> Bar -> 2,<br> Foo -> 1,<br>}

**Output:** 2

***

### Example 3: Base case

**Argument values:**

* **Key:** 1
* **Map:** {<br> 1 -> 10,<br> 2 -> 20,<br>}

**Output:** 10

***

### Example 4: Base case

**Argument values:**

* **Key:** Foo
* **Map:** {<br> Bar -> World,<br> Foo -> Hello,<br>}

**Output:** Hello

***

### Example 5: Base case

**Argument values:**

* **Key:** Foo
* **Map:** {<br> Bar -> World,<br>}

**Output:** *null*

***

### Example 6: Base case

**Argument values:**

* **Key:** \[ \[ 1 ], \[ 1 ] ]
* **Map:** {<br> \[ \[ 1 ], \[ 1 ] ] -> Foo,<br>}

**Output:** Foo

***

### Example 7: Null case

**Argument values:**

* **Key:** `key`
* **Map:** `map`

| map | key | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |
| {<br> Foo -> Hello,<br>} | *null* | *null* |
| *null* | Foo | *null* |

***
