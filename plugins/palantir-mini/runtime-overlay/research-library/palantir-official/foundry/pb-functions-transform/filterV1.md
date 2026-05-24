---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/filterV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/filterV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "01e416899402f3fd28f34f7f8ab0fe3c4acd6e2a278759409cf34ec4eacff145"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Filter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Filter

> Supported in: Batch, Faster, Streaming

Filters the input dataset based on the specified filter condition.

**Transform categories**: Data preparation, Popular

## Declared arguments

* **Dataset:** Dataset to filter.<br>*Table*
* **Filter condition:** Condition to filter on. Values that return true are kept, others are removed.<br>*Expression\<Boolean>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Filter condition:** `recently_serviced`

**Input:**

| recently\_serviced | tail\_number |
| ----- | ----- |
| true | KK-150 |
| false | XB-120 |
| true | MT-190 |

**Output:**

| recently\_serviced | tail\_number |
| ----- | ----- |
| true | KK-150 |
| true | MT-190 |

***

### Example 2: Base case

**Description:** Nulls are treated as false

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Filter condition:** `recently_serviced`

**Input:**

| recently\_serviced | tail\_number |
| ----- | ----- |
| *null* | KK-150 |
| true | XB-120 |

**Output:**

| recently\_serviced | tail\_number |
| ----- | ----- |
| true | XB-120 |

***
