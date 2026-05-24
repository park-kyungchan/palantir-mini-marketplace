---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/leftLookupJoinV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/leftLookupJoinV2/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fe7c4c17b385a6142d66fada4b5f1f051ec661f130b5a0d88e18fb2648fdff4b"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Left lookup join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Left lookup join

> Supported in: Streaming

Joins two datasets together, keeping all rows from the left table and only matching rows from the right dataset.

**Transform categories**: Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Join condition:** A list of columns from left and right input to join on.<br>*List\<Tuple\<Column\<Boolean | Byte | Date | Double | Float | Integer | Long | Short | String | Timestamp>, Column\<Boolean | Byte | Date | Double | Float | Integer | Long | Short | String | Timestamp>>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Max rows to join with a single row:** Places a limit on the maximum number of rows from the right input that a single row from the left can be joined with. The highest this limit can go is ten. Setting too high of a limit can have negative performance implications.<br>*Literal\<Integer>*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** \[(`tail_number`, `tail_number`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Max rows to join with a single row:** 10
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| XB-123 | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| KK-452 | new air | 222 | 1 |
| PA-452 | new air | 212 | 2 |
| XB-123 | foundry airline | 1134 | 2 |

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
| MT-222 | new airline | CPH |
| XB-123 | foundry airline | LHR |
| MT-222 | new air | CPH |
| KK-452 | new air | JFK |
| PA-452 | new air | *null* |
| XB-123 | foundry airline | LHR |

***

### Example 2: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline, factor],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** \[(`tail_number`, `tail_number`), (`factor`, `factor`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Max rows to join with a single row:** 10
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| XB-123 | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| KK-452 | new air | 222 | 1 |
| PA-452 | new air | 212 | 2 |
| XB-123 | foundry airline | 1134 | 2 |

ri.foundry.main.dataset.right

| tail\_number | home\_airport | factor |
| ----- | ----- | ----- |
| XB-123 | LHR | 2 |
| MT-222 | CPH | 1 |
| KK-452 | JFK | 10 |
| JR-201 | IAD | 4 |

**Output:**

| tail\_number | airline | factor | home\_airport |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 2 | LHR |
| MT-222 | new airline | 5 | *null* |
| XB-123 | foundry airline | 5 | *null* |
| MT-222 | new air | 4 | *null* |
| KK-452 | new air | 1 | *null* |
| PA-452 | new air | 2 | *null* |
| XB-123 | foundry airline | 2 | LHR |

***

### Example 3: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** \[(`tail_number`, `tail_number`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Max rows to join with a single row:** 10
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| XB-123 | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| KK-452 | new air | 222 | 1 |
| PA-452 | new air | 212 | 2 |
| XB-123 | foundry airline | 1134 | 2 |

ri.foundry.main.dataset.right

| tail\_number | home\_airport |
| ----- | ----- |
| XB-123 | LHR |
| XB-123 | LGW |
| MT-222 | CPH |
| KK-452 | JFK |
| JR-201 | IAD |

**Output:**

| tail\_number | airline | miles | factor | home\_airport |
| ----- | ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 | LHR |
| XB-123 | foundry air | 124 | 2 | LGW |
| MT-222 | new airline | 1123 | 5 | CPH |
| XB-123 | foundry airline | 335 | 5 | LHR |
| XB-123 | foundry airline | 335 | 5 | LGW |
| MT-222 | new air | 565 | 4 | CPH |
| KK-452 | new air | 222 | 1 | JFK |
| PA-452 | new air | 212 | 2 | *null* |
| XB-123 | foundry airline | 1134 | 2 | LHR |
| XB-123 | foundry airline | 1134 | 2 | LGW |

***
