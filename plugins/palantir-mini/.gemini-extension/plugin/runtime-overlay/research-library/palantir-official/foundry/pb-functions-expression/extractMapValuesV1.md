---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/extractMapValuesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/extractMapValuesV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7331e464db5607ee306f2cb16f95283854e5bf4db0ada2354fe80273d24b04bb"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract map values"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract map values

> Supported in: Batch, Faster, Streaming

Return map values as an array. Note the order of array elements is not deterministic.

**Expression categories:** Map

## Declared arguments

* **Map:** Map expression.<br>*Expression\<Map\<AnyType, V>>*

**Type variable bounds:** *V accepts AnyType*

**Output type:** *Array\<V>*

## Examples

### Example 1: Base case

**Argument values:**

* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> MT-111 -> 2,<br> XB-134 -> 1,<br>} | \[ 1, 2 ] |

***

### Example 2: Null case

**Argument values:**

* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> MT-111 -> 2,<br> XB-134 -> *null*,<br>} | \[ *null*, 2 ] |
| *null* | *null* |

***
