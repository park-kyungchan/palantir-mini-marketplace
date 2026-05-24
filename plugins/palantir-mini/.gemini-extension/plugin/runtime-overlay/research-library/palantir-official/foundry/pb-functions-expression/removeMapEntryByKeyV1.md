---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/removeMapEntryByKeyV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/removeMapEntryByKeyV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5f29c995abfa3ca8455b3604fdc7aabe0b93a8b6e1c763e6b3b4978ea9d38bf1"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Remove map entry by key"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Remove map entry by key

> Supported in: Batch, Streaming

Removes a map entry by the given key.

**Expression categories:** Map

## Declared arguments

* **Key:** Key of the entry to remove.<br>*Expression\<K>*
* **Map:** Map expression.<br>*Expression\<Map\<K, V>>*

**Type variable bounds:** *K accepts AnyType\*\*V accepts AnyType*

**Output type:** *Map\<K, V>*

## Examples

### Example 1: Base case

**Argument values:**

* **Key:** k
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> 1,<br> k -> 2,<br>} | {<br> a -> 1,<br>} |

***

### Example 2: Base case

**Argument values:**

* **Key:** j
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> 1,<br> k -> 2,<br>} | {<br> a -> 1,<br> k -> 2,<br>} |

***

### Example 3: Null case

**Argument values:**

* **Key:** k
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Null case

**Argument values:**

* **Key:** *null*
* **Map:** `map_col`

| map\_col | **Output** |
| ----- | ----- |
| {<br> a -> foo,<br>} | {<br> a -> foo,<br>} |

***
