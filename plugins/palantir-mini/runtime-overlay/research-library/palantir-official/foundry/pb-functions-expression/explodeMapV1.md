---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/explodeMapV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/explodeMapV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "691ba6405afed872bed02df39674629df5e36121d77c2fef409207c16cc459cb"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Explode map"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Explode map

> Supported in: Batch, Streaming

Explode map into a row per key, value pair.

**Expression categories:** Map

## Declared arguments

* **Expression:** The map to explode.<br>*Expression\<Map\<TKey, TValue>>*

**Type variable bounds:** *TKey accepts AnyType\*\*TValue accepts AnyType*

**Output type:** *Struct\<Optional\[key]:TKey, Optional\[value]:TValue>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `map`

**Given input table:**

| map |
| ----- |
| {<br> 1 -> val1,<br> 2 -> val2,<br>} |
| {<br> 3 -> val3,<br> 4 -> val4,<br>} |

**Expected output table:** | map |
| ----- |
| {<br> key -> 1,<br> value -> val1,<br>} |
| {<br> key -> 2,<br> value -> val2,<br>} |
| {<br> key -> 3,<br> value -> val3,<br>} |
| {<br> key -> 4,<br> value -> val4,<br>} |

***

### Example 2: Edge case

**Argument values:**

* **Expression:** `map`

**Given input table:**

| map |
| ----- |
| {<br> k1 -> q1,<br>} |
| {<br><br>} |

**Expected output table:** | map |
| ----- |
| {<br> key -> k1,<br> value -> q1,<br>} |

***

### Example 3: Edge case

**Argument values:**

* **Expression:** `map`

**Given input table:**

| map |
| ----- |
| *null* |

**Expected output table:** | map |
| ----- |

***
