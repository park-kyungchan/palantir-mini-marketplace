---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2ada62946be958766891aeeddf1e5eae77cb8fb6654af9d896b94b9cf2516f23"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Aggregate

> Supported in: Batch, Faster

Performs the specified aggregations on the input dataset grouped by a set of columns.

**Transform categories**: Aggregate, Popular

## Declared arguments

* **Aggregations:** List of aggregations to perform on the dataset.<br>*List\<Expression\<AnyType>>*
* **Dataset:** Dataset to perform aggregate on.<br>*Table*
* *optional* **Group by columns:** List of columns to group the dataset by when aggregating. If empty, no group by is applied.<br>*List\<Column\<AnyType>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: factor,<br> expression: <br>sum(<br> expression: `factor`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.aggregate
* **Group by columns:** \[`tail_number`]

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

| tail\_number | factor |
| ----- | ----- |
| XB-123 | 10 |
| MT-222 | 9 |
| KK-452 | 1 |

***
