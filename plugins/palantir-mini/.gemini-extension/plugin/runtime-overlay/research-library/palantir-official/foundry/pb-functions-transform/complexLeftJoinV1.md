---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/complexLeftJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/complexLeftJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "099d26729f3e7f08e3bd0c9fe3c21b6a09c3e558ba370da8bd74ab4f547e4671"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Left join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Left join

> Supported in: Batch, Faster

Joins two datasets together, keeping all rows from the left table and only rows which satisfy the provided condition from the right table.

**Transform categories**: Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Join condition:** Condition on which to join.<br>*Expression\<Boolean>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** <br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>)
* **Left dataset:** ri.foundry.main.dataset.left
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

**Description:** Simple complex join condition.

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline, factor],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, home\_airport, factor],<br>)
* **Join condition:** <br>lessThan(<br> left: `factor`,<br> right: `factor`,<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** right\_

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

| tail\_number | airline | factor | right\_tail\_number | right\_home\_airport | right\_factor |
| ----- | ----- | ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 2 | KK-452 | JFK | 10 |
| XB-123 | foundry air | 2 | JR-201 | IAD | 4 |
| MT-222 | new airline | 5 | KK-452 | JFK | 10 |
| XB-123 | foundry airline | 5 | KK-452 | JFK | 10 |
| MT-222 | new air | 4 | KK-452 | JFK | 10 |
| KK-452 | new air | 1 | XB-123 | LHR | 2 |
| KK-452 | new air | 1 | KK-452 | JFK | 10 |
| KK-452 | new air | 1 | JR-201 | IAD | 4 |
| PA-452 | new air | 2 | KK-452 | JFK | 10 |
| PA-452 | new air | 2 | JR-201 | IAD | 4 |
| XB-123 | foundry airline | 2 | KK-452 | JFK | 10 |
| XB-123 | foundry airline | 2 | JR-201 | IAD | 4 |

***

### Example 3: Base case

**Description:** When joining on a null, equals null condition, the row will not be joined.

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** <br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 |
| *null* | new airline | 1123 | 5 |

ri.foundry.main.dataset.right

| tail\_number | home\_airport |
| ----- | ----- |
| XB-123 | LHR |
| *null* | CPH |

**Output:**

| tail\_number | airline | home\_airport |
| ----- | ----- | ----- |
| XB-123 | foundry air | LHR |
| *null* | new airline | *null* |

***

### Example 4: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline, factor],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** <br>and(<br> conditions: \[<br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>), <br>equals(<br> left: `factor`,<br> right: `factor`,<br>)],<br>)
* **Left dataset:** ri.foundry.main.dataset.left
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

### Example 5: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[home\_airport],<br>)
* **Join condition:** <br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>)
* **Left dataset:** ri.foundry.main.dataset.left
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

| tail\_number | airline | miles | factor | home\_airport |
| ----- | ----- | ----- | ----- | ----- |
| XB-123 | foundry air | 124 | 2 | LHR |
| MT-222 | new airline | 1123 | 5 | CPH |
| XB-123 | foundry airline | 335 | 5 | LHR |
| MT-222 | new air | 565 | 4 | CPH |
| KK-452 | new air | 222 | 1 | JFK |
| PA-452 | new air | 212 | 2 | *null* |
| XB-123 | foundry airline | 1134 | 2 | LHR |

***
