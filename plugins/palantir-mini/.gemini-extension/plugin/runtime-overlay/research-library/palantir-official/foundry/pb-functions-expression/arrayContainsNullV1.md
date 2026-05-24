---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayContainsNullV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayContainsNullV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9ac420c66c8df961dbc4ee8e892bf44cdec15037002999d810556a72280ac959"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array contains null"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array contains null

> Supported in: Batch, Faster, Streaming

Returns true if the `array` contains null.

**Expression categories:** Array, Boolean

## Declared arguments

* **Expression:** An array that could contain null values.<br>*Expression\<Array\<ComparableType>>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| \[ AWE-112, BRR-123, *null* ] | true |
| \[ AWE-222, ABC-543 ] | false |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| *null* | false |
| \[ AWE-222, ABC-543 ] | false |

***

### Example 3: Edge case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| \[  ] | false |

***
