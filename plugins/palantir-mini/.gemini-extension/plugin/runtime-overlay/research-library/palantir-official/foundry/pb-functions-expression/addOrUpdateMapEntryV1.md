---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/addOrUpdateMapEntryV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/addOrUpdateMapEntryV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "57137e408d275dcbcf90c6aa234803eb9eac0a97e59af2c79884b7a97486d4f0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Add or update map"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add or update map

> Supported in: Batch, Streaming

Updates a value by key in a map or adds new key value pair.

**Expression categories:** Map

## Declared arguments

* **Expression:** Expression to set as value for the key.<br>*Expression\<V>*
* **Key:** Key to add or update.<br>*Expression\<K>*
* **Map:** Map expression.<br>*Expression\<Map\<K, V>>*

**Type variable bounds:** *K accepts AnyType\*\*V accepts AnyType*

**Output type:** *Map\<K, V>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 4
* **Key:** k
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> 1,<br> b -> 2,<br>} | {<br> a -> 1,<br> b -> 2,<br> k -> 4,<br>} |

***

### Example 2: Base case

**Argument values:**

* **Expression:** 4
* **Key:** k
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> 1,<br> b -> 2,<br> k -> 2,<br>} | {<br> a -> 1,<br> b -> 2,<br> k -> 4,<br>} |
| {<br> a -> 1,<br> b -> 2,<br>} | {<br> a -> 1,<br> b -> 2,<br> k -> 4,<br>} |

***

### Example 3: Base case

**Argument values:**

* **Expression:** 4
* **Key:** k
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> 1,<br> b -> 2,<br> k -> 2,<br>} | {<br> a -> 1,<br> b -> 2,<br> k -> 4,<br>} |

***

### Example 4: Null case

**Argument values:**

* **Expression:** 4
* **Key:** *null*
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> 1,<br>} | {<br> a -> 1,<br>} |

***

### Example 5: Null case

**Argument values:**

* **Expression:** 4
* **Key:** k
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| *null* | *null* |

***
