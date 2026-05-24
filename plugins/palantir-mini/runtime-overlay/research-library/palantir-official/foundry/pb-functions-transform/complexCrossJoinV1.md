---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/complexCrossJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/complexCrossJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "92f916347f91f09dffdf8c7be8c1f645026b62a5413d6a7e9cba52c141d3e206"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Cross join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Cross join

> Supported in: Batch, Faster

Cross joins left and right dataset inputs together, matching all rows from each side against all rows from the other. The output is the cartesian product of the two datasets.

**Transform categories**: Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| PA-452 | new air | 212 | 2 |

ri.foundry.main.dataset.right

| tail\_number | home\_airport |
| ----- | ----- |
| XB-123 | LHR |
| MT-222 | CPH |
| KK-452 | JFK |
| JR-201 | IAD |

**Output:**

| tail\_number | airline | home\_airport |
| ----- | ----- | ----- |
| XB-123 | foundry air | LHR |
| XB-123 | foundry air | CPH |
| XB-123 | foundry air | JFK |
| XB-123 | foundry air | IAD |
| MT-222 | new airline | LHR |
| MT-222 | new airline | CPH |
| MT-222 | new airline | JFK |
| MT-222 | new airline | IAD |
| PA-452 | new air | LHR |
| PA-452 | new air | CPH |
| PA-452 | new air | JFK |
| PA-452 | new air | IAD |

***

### Example 2: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| PA-452 | new air | 212 | 2 |

ri.foundry.main.dataset.right

| tail\_number | home\_airport |
| ----- | ----- |
| XB-123 | LHR |
| MT-222 | CPH |
| KK-452 | JFK |
| JR-201 | IAD |

**Output:**

| tail\_number | airline | miles | factor | home\_airport |
| ----- | ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 | LHR |
| XB-123 | foundry air | 124 | 2 | CPH |
| XB-123 | foundry air | 124 | 2 | JFK |
| XB-123 | foundry air | 124 | 2 | IAD |
| MT-222 | new airline | 1123 | 5 | LHR |
| MT-222 | new airline | 1123 | 5 | CPH |
| MT-222 | new airline | 1123 | 5 | JFK |
| MT-222 | new airline | 1123 | 5 | IAD |
| PA-452 | new air | 212 | 2 | LHR |
| PA-452 | new air | 212 | 2 | CPH |
| PA-452 | new air | 212 | 2 | JFK |
| PA-452 | new air | 212 | 2 | IAD |

***
