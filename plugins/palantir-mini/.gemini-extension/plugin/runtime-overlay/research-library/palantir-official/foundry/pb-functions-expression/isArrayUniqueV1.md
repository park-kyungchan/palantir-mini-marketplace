---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isArrayUniqueV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isArrayUniqueV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "01da082918d29f35782cbbd57d0910b22430d7a6f1131a7c9e72a19af95e30f2"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array elements are distinct"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array elements are distinct

> Supported in: Batch, Faster, Streaming

Returns true if the array's elements are distinct, false otherwise. If the array is null, the returned value is false.

**Expression categories:** Array, Boolean

## Declared arguments

* **Expression:** An array that could contain duplicate elements.<br>*Expression\<Array\<ComparableType>>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| \[ ABC-123, DCE-123, EFG-123 ] | true |
| \[ ABC-123, ABC-123, EFG-123 ] | false |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| \[  ] | true |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| \[ ABC-123, *null* ] | true |
| \[ ABC-123, *null*, ABC-123 ] | false |
| \[ *null*, *null* ] | false |

***

### Example 4: Null case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| *null* | false |
| \[ ABC-123, EFG-123 ] | true |

***

### Example 5: Edge case

**Argument values:**

* **Expression:** `part_ids`

| part\_ids | **Output** |
| ----- | ----- |
| \[ \[ ABC-123, EFG-123 ], \[ ABC-123, EFG-123 ] ] | false |
| \[ \[ ABC-123, EFG-123 ], \[ ABC-123, XYZ-123 ] ] | true |
| \[ \[ ABC-123, EFG-123 ], \[ EFG-123, ABC-123 ] ] | true |

***

### Example 6: Edge case

**Argument values:**

* **Expression:** `address`

| address | **Output** |
| ----- | ----- |
| \[ {<br> **city**: New York,<br> **street**: Broadway,<br>}, {<br> **city**: New York,<br> **street**: Broadway,<br>} ] | false |
| \[ {<br> **city**: New York,<br> **street**: Broadway,<br>}, {<br> **city**: Los Angeles,<br> **street**: Hoover Street,<br>} ] | true |

***
