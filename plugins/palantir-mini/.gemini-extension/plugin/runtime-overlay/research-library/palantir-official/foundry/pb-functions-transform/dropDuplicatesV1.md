---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/dropDuplicatesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/dropDuplicatesV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cd0c60ba9fb7ed02418e23dca8ce8f00344aa538a3468dec0e952c333bd2354c"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Drop duplicates"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Drop duplicates

> Supported in: Batch, Faster

Drops duplicate rows from the input.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to deduplicate rows.<br>*Table*
* *optional* **Column subset:** If any columns are specified only those will be used when determining uniqueness.<br>*Set\<Column\<AnyType>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.aggregate
* **Column subset:** {`tail_number`}

**Input:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| XB-123 | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| KK-452 | new air | 222 | 1 |
| XB-123 | foundry airline | 1134 | 3 |

**Output:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| KK-452 | new air | 222 | 1 |

***

### Example 2: Base case

**Description:** No subset looks for exact duplicates.

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.aggregate
* **Column subset:** {}

**Input:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| XB-123 | foundry air | 124 | 2 |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| MT-222 | new airline | 1123 | 5 |

**Output:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |

***
