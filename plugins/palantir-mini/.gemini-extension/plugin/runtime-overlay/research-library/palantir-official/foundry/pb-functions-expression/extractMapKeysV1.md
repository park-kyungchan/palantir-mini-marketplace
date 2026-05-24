---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/extractMapKeysV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/extractMapKeysV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b3af7ded4aaa571f598d95d3da3c3e64447c0188636e41b68d71b9317f05aae8"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract map keys"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract map keys

> Supported in: Batch, Faster, Streaming

Return map keys as an array. Note the order of array elements is not deterministic.

**Expression categories:** Map

## Declared arguments

* **Map:** Map expression.<br>*Expression\<Map\<K, AnyType>>*

**Type variable bounds:** *K accepts AnyType*

**Output type:** *Array\<K>*

## Examples

### Example 1: Base case

**Argument values:**

* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| {<br> MT-111 -> 2,<br> XB-134 -> 1,<br>} | \[ XB-134, MT-111 ] |

***

### Example 2: Null case

**Argument values:**

* **Map:** `flight_number`

| flight\_number | **Output** |
| ----- | ----- |
| *null* | *null* |

***
