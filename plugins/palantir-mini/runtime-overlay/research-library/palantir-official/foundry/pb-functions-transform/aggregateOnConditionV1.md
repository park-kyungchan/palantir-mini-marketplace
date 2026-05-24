---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/aggregateOnConditionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/aggregateOnConditionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9fd090900544ab0936e81741138e7fc180932069d46593900b1a96ec4adfbf49"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Aggregate on condition"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Aggregate on condition

> Supported in: Batch, Faster

Aggregate expressions based on a condition statement.

**Transform categories**: Aggregate, Popular

## Declared arguments

* **Condition for columns to aggregate on:** All columns in the input schema will be tested to see if they match this condition. If they match, the given expressions will be applied to them.<br>*ColumnPredicate*
* **Dataset:** Dataset to apply operations to.<br>*Table*
* **Expressions to aggregate:** The aggregate expression to apply once per each column that matches condition.<br>*List\<Expression\<AnyType>>*
* *optional* **Group by columns:** List of columns to group the dataset by when aggregating. If empty, no group by is applied.<br>*List\<Column\<AnyType>>*

## Examples

### Example 1: Edge case

**Description:** Count non null rows for all columns.

**Argument values:**

* **Condition for columns to aggregate on:** <br>allColumns(<br><br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expressions to aggregate:** \[<br>dynamicAlias(<br> expression: <br>rowCount(<br> expression: `column`,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_non_null`],<br>),<br>)]
* **Group by columns:** *null*

**Input:**

| id | value | distance |
| ----- | ----- | ----- |
| 1 | 100 | 2000 |
| 2 | *null* | 100 |
| 3 | 500 | 300 |

**Output:**

| id\_non\_null | value\_non\_null | distance\_non\_null |
| ----- | ----- | ----- |
| 3 | 2 | 3 |

***

### Example 2: Edge case

**Description:** Count non null and mean of integer columns.

**Argument values:**

* **Condition for columns to aggregate on:** <br>columnHasType(<br> type: Integer,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expressions to aggregate:** \[<br>dynamicAlias(<br> expression: <br>rowCount(<br> expression: `column`,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_non_null`],<br>),<br>), <br>dynamicAlias(<br> expression: <br>mean(<br> expression: `column`,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_mean`],<br>),<br>)]
* **Group by columns:** *null*

**Input:**

| id | value | distance |
| ----- | ----- | ----- |
| 1 | 100 | 2000 |
| 2 | *null* | 100 |
| 3 | 500 | 300 |

**Output:**

| id\_non\_null | id\_mean | value\_non\_null | value\_mean |
| ----- | ----- | ----- | ----- |
| 3 | 2.0 | 2 | 300.0 |

***

### Example 3: Edge case

**Argument values:**

* **Condition for columns to aggregate on:** <br>columnHasType(<br> type: Integer,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expressions to aggregate:** \[<br>dynamicAlias(<br> expression: <br>mean(<br> expression: `column`,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_mean`],<br>),<br>)]
* **Group by columns:** \[`id`]

**Input:**

| id | value | distance | airline |
| ----- | ----- | ----- | ----- |
| 1 | 100 | 2000 | new air |
| 1 | 200 | 3000 | new air |
| 2 | 500 | 3000 | foundry air |
| 2 | 400 | 1000 | foundry air |

**Output:**

| id | id\_mean | value\_mean | distance\_mean |
| ----- | ----- | ----- | ----- |
| 1 | 1.0 | 150.0 | 2500.0 |
| 2 | 2.0 | 450.0 | 2000.0 |

***

### Example 4: Edge case

**Description:** Mean of all integer columns.

**Argument values:**

* **Condition for columns to aggregate on:** <br>columnHasType(<br> type: Integer,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expressions to aggregate:** \[<br>dynamicAlias(<br> expression: <br>mean(<br> expression: `column`,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_mean`],<br>),<br>)]
* **Group by columns:** *null*

**Input:**

| id | value | distance |
| ----- | ----- | ----- |
| 1 | 100 | 2000 |
| 3 | 500 | 300 |

**Output:**

| id\_mean | value\_mean |
| ----- | ----- |
| 2.0 | 300.0 |

***
