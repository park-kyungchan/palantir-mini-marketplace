---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/flattenStructV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/flattenStructV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e74496a98931fb3b577d7857d009962678a80315c89ed570641ddae22c8f5d76"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Flatten struct"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Flatten struct

> Supported in: Batch, Faster, Streaming

Take all fields in a struct and turn them into columns in the output dataset.

**Transform categories**: Struct

## Declared arguments

* **Dataset:** Dataset containing struct column.<br>*Table*
* **Expression:** Expression evaluating to a struct column that will be flattened.<br>*Expression\<Struct>*
* **Max depth:** The depth level specifying how deep a nested struct will be flattened.<br>*Literal\<Integer>*
* *optional* **Column prefix:** Add a prefix to all columns created during the flatten.<br>*Literal\<String>*
* *optional* **Separator:** Separate field names coming from nested structs.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Expression:** `raw`
* **Max depth:** 2
* **Column prefix:** new\_
* **Separator:** *null*

**Input:**

| raw |
| ----- |
| {<br> **airline**: {<br> **id**: NA,<br> **name**: new air,<br>},<br> **tail\_no**: NA-123,<br>} |
| {<br> **airline**: {<br> **id**: FA,<br> **name**: foundry airways,<br>},<br> **tail\_no**: FA-123,<br>} |

**Output:**

| new\_airline\_name | new\_airline\_id | new\_tail\_no | raw |
| ----- | ----- | ----- | ----- |
| new air | NA | NA-123 | {<br> **airline**: {<br> **id**: NA,<br> **name**: new air,<br>},<br> **tail\_no**: NA-123,<br>} |
| foundry airways | FA | FA-123 | {<br> **airline**: {<br> **id**: FA,<br> **name**: foundry airways,<br>},<br> **tail\_no**: FA-123,<br>} |

***

### Example 2: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Expression:** `raw`
* **Max depth:** 2
* **Column prefix:** new\_
* **Separator:** #SEPARATOR#

**Input:**

| raw |
| ----- |
| {<br> **airline**: {<br> **id**: NA,<br> **name**: new air,<br>},<br> **tail\_no**: NA-123,<br>} |
| {<br> **airline**: {<br> **id**: FA,<br> **name**: foundry airways,<br>},<br> **tail\_no**: FA-123,<br>} |

**Output:**

| new\_airline#SEPARATOR#name | new\_airline#SEPARATOR#id | new\_tail\_no | raw |
| ----- | ----- | ----- | ----- |
| new air | NA | NA-123 | {<br> **airline**: {<br> **id**: NA,<br> **name**: new air,<br>},<br> **tail\_no**: NA-123,<br>} |
| foundry airways | FA | FA-123 | {<br> **airline**: {<br> **id**: FA,<br> **name**: foundry airways,<br>},<br> **tail\_no**: FA-123,<br>} |

***

### Example 3: Null case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Expression:** `raw`
* **Max depth:** 2
* **Column prefix:** new\_
* **Separator:** *null*

**Input:**

| raw |
| ----- |
| *null* |
| {<br> **airline**: *null*,<br> **tail\_no**: NA-123,<br>} |
| {<br> **airline**: {<br> **id**: FA,<br> **name**: *null*,<br>},<br> **tail\_no**: FA-123,<br>} |

**Output:**

| new\_airline\_name | new\_airline\_id | new\_tail\_no | raw |
| ----- | ----- | ----- | ----- |
| *null* | *null* | *null* | *null* |
| *null* | *null* | NA-123 | {<br> **airline**: *null*,<br> **tail\_no**: NA-123,<br>} |
| *null* | FA | FA-123 | {<br> **airline**: {<br> **id**: FA,<br> **name**: *null*,<br>},<br> **tail\_no**: FA-123,<br>} |

***
