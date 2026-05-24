---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/complexKnnJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/complexKnnJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e616fabcbf4b4b81cfa69b860aaaaef14dcb6fcd96ce95d3c62a9a493a16394a"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > KNN join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# KNN join

> Supported in: Batch

Return the 'k' nearest rows from the right dataset for each row in the left dataset, based on the distance measure.

**Transform categories**: Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Distance measure expression:** Distance measure expression between columns in the left and right datasets. E.g. Levenshtein distance.<br>*Expression\<Numeric>*
* **K nearest:** The number of nearest rows to return, i.e. if k=2 then the number of output rows will be at least doubled and the nearest 2 rows will be joined from the right. In case of ties, more rows may be returned.<br>*Literal\<Integer>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Rank column name:** Name of the column to store the rank of the distance.<br>*Literal\<String>*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[fuzzy\_airline, home\_airport],<br>)
* **Distance measure expression:** <br>alias(<br> alias: distance,<br> expression: <br>levenshteinDistance(<br> ignoreCase: true,<br> left: `airline`,<br> right: `fuzzy_airline`,<br>),<br>)
* **K nearest:** 2
* **Left dataset:** ri.foundry.main.dataset.left
* **Rank column name:** rank
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

| fuzzy\_airline | home\_airport |
| ----- | ----- |
| air | LHR |
| new airline | CPH |
| new plane | JFK |
| old air | IAD |

**Output:**

| rank | distance | tail\_number | airline | fuzzy\_airline | home\_airport |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | 3 | PA-452 | new air | old air | IAD |
| 2 | 4 | PA-452 | new air | air | LHR |
| 2 | 4 | PA-452 | new air | new airline | CPH |
| 2 | 4 | PA-452 | new air | new plane | JFK |
| 1 | 0 | MT-222 | new airline | new airline | CPH |
| 2 | 4 | MT-222 | new airline | new plane | JFK |
| 1 | 5 | XB-123 | foundry air | old air | IAD |
| 2 | 8 | XB-123 | foundry air | air | LHR |

***

### Example 2: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Distance measure expression:** <br>alias(<br> alias: distance,<br> expression: <br>levenshteinDistance(<br> ignoreCase: true,<br> left: `airline`,<br> right: `airline`,<br>),<br>)
* **K nearest:** 2
* **Left dataset:** ri.foundry.main.dataset.left
* **Rank column name:** rank
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

| airline | home\_airport |
| ----- | ----- |
| air | LHR |
| new airline | CPH |
| new plane | JFK |
| old air | IAD |

**Output:**

| rank | distance | tail\_number | airline | home\_airport |
| ----- | ----- | ----- | ----- | ----- |
| 1 | 3 | PA-452 | new air | IAD |
| 2 | 4 | PA-452 | new air | LHR |
| 2 | 4 | PA-452 | new air | CPH |
| 2 | 4 | PA-452 | new air | JFK |
| 1 | 0 | MT-222 | new airline | CPH |
| 2 | 4 | MT-222 | new airline | JFK |
| 1 | 5 | XB-123 | foundry air | IAD |
| 2 | 8 | XB-123 | foundry air | LHR |

***

### Example 3: Base case

**Description:** If the distance measure returns null, this is considered the furthest distance.

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[fuzzy\_airline, home\_airport],<br>)
* **Distance measure expression:** <br>alias(<br> alias: distance,<br> expression: <br>levenshteinDistance(<br> ignoreCase: true,<br> left: `airline`,<br> right: `fuzzy_airline`,<br>),<br>)
* **K nearest:** 2
* **Left dataset:** ri.foundry.main.dataset.left
* **Rank column name:** rank
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

| fuzzy\_airline | home\_airport |
| ----- | ----- |
| air | LHR |
| *null* | CPH |
| new plane | JFK |
| old air | IAD |

**Output:**

| rank | distance | tail\_number | airline | fuzzy\_airline | home\_airport |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | 3 | PA-452 | new air | old air | IAD |
| 2 | 4 | PA-452 | new air | air | LHR |
| 2 | 4 | PA-452 | new air | new plane | JFK |
| 1 | 4 | MT-222 | new airline | new plane | JFK |
| 2 | 7 | MT-222 | new airline | old air | IAD |
| 1 | 5 | XB-123 | foundry air | old air | IAD |
| 2 | 8 | XB-123 | foundry air | air | LHR |

***

### Example 4: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[fuzzy\_airline, home\_airport],<br>)
* **Distance measure expression:** <br>alias(<br> alias: distance,<br> expression: <br>levenshteinDistance(<br> ignoreCase: true,<br> left: `airline`,<br> right: `fuzzy_airline`,<br>),<br>)
* **K nearest:** 2
* **Left dataset:** ri.foundry.main.dataset.left
* **Rank column name:** rank
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** right\_

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| PA-452 | new air | 212 | 2 |

ri.foundry.main.dataset.right

| fuzzy\_airline | home\_airport |
| ----- | ----- |
| air | LHR |
| new airline | CPH |
| new plane | JFK |
| old air | IAD |

**Output:**

| rank | distance | tail\_number | airline | right\_fuzzy\_airline | right\_home\_airport |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | 3 | PA-452 | new air | old air | IAD |
| 2 | 4 | PA-452 | new air | air | LHR |
| 2 | 4 | PA-452 | new air | new airline | CPH |
| 2 | 4 | PA-452 | new air | new plane | JFK |
| 1 | 0 | MT-222 | new airline | new airline | CPH |
| 2 | 4 | MT-222 | new airline | new plane | JFK |
| 1 | 5 | XB-123 | foundry air | old air | IAD |
| 2 | 8 | XB-123 | foundry air | air | LHR |

***
