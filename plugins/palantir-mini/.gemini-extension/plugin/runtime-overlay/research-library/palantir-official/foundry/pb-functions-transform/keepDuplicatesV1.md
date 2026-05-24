---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/keepDuplicatesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/keepDuplicatesV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5b6a3e8e3fc597dd8590f483564692dc20936159cce85402cca0915ac8322b50"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Keeps duplicates"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Keeps duplicates

> Supported in: Batch, Faster

Keep duplicate rows from the input.

**Transform categories**: Other

## Declared arguments

* **Column subset:** If any columns are specified only those will be used when determining uniqueness.<br>*Set\<Column\<AnyType>>*
* **Dataset:** Dataset to keep duplicate rows from.<br>*Table*

## Examples

### Example 1: Base case

**Argument values:**

* **Column subset:** {`tail_number`}
* **Dataset:** ri.foundry.main.dataset.aggregate

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
| XB-123 | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| XB-123 | foundry airline | 1134 | 3 |

***

### Example 2: Base case

**Description:** No subset looks for exact duplicates.

**Argument values:**

* **Column subset:** {}
* **Dataset:** ri.foundry.main.dataset.aggregate

**Input:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| XB-123 | foundry air | 124 | 2 |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 6 |
| MT-222 | new airline | 1123 | 5 |

**Output:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| XB-123 | foundry air | 124 | 2 |
| XB-123 | foundry air | 124 | 2 |

***

### Example 3: Null case

**Argument values:**

* **Column subset:** {`tail_number`}
* **Dataset:** ri.foundry.main.dataset.aggregate

**Input:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| *null* | foundry air | 124 | 2 |
| *null* | new airline | 1123 | 5 |
| *null* | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| KK-452 | new air | 222 | 1 |
| XB-123 | foundry airline | 1134 | 3 |

**Output:**

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| *null* | foundry air | 124 | 2 |
| *null* | new airline | 1123 | 5 |
| *null* | foundry airline | 335 | 5 |

***
