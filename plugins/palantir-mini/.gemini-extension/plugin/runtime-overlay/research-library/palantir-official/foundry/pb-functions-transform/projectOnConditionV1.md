---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/projectOnConditionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/projectOnConditionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fd965a875bfe95e22d33363f00f9977de6cecf6c0003db4986acd4511c4b451c"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Apply to multiple columns"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Apply to multiple columns

> Supported in: Batch, Faster, Streaming

Transforms input dataset either by selecting columns or applying functions to columns.

**Transform categories**: Popular

## Declared arguments

* **Condition for columns to project:** All columns in the input schema will be tested to see if they match this condition. If they match, the given expression will be applied to them.<br>*ColumnPredicate*
* **Dataset:** Dataset to apply operations to.<br>*Table*
* **Expression to apply:** The expression to apply once per each column that matches condition.<br>*Expression\<AnyType>*
* **Keep remaining columns:** Keeps all columns not projected in the dataset.<br>*Literal\<Boolean>*
* *optional* **Keep matched columns:** Keep the original columns that were matched by the condition. If a projected column has the same name, the original column will be overridden.<br>*Literal\<Boolean>*

## Examples

### Example 1: Base case

**Description:** Rename matched columns based on regex.

**Argument values:**

* **Condition for columns to project:** <br>columnHasType(<br> type: String,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expression to apply:** <br>dynamicAlias(<br> expression: <br>cast(<br> expression: `column`,<br> type: Integer,<br>),<br> transformer: <br>columnNameRegexReplace(<br> input: `column`,<br> pattern: str,<br> replace: int,<br>),<br>)
* **Keep remaining columns:** true
* **Keep matched columns:** false

**Input:**

| id | distance\_str | factor\_str |
| ----- | ----- | ----- |
| 1 | 2000 | 1265 |

**Output:**

| distance\_int | factor\_int | id |
| ----- | ----- | ----- |
| 2000 | 1265 | 1 |

***

### Example 2: Edge case

**Description:** You can choose to keep both matched and remaining columns.

**Argument values:**

* **Condition for columns to project:** <br>columnHasType(<br> type: String,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expression to apply:** <br>dynamicAlias(<br> expression: <br>cast(<br> expression: `column`,<br> type: Integer,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_as_integer`],<br>),<br>)
* **Keep remaining columns:** true
* **Keep matched columns:** true

**Input:**

| id | distance |
| ----- | ----- |
| 1 | 2000 |

**Output:**

| distance\_as\_integer | id | distance |
| ----- | ----- | ----- |
| 2000 | 1 | 2000 |

***

### Example 3: Edge case

**Description:** You can choose to keep the columns that the condition matches, in addition to the new columns that are created.

**Argument values:**

* **Condition for columns to project:** <br>columnHasType(<br> type: String,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expression to apply:** <br>dynamicAlias(<br> expression: <br>cast(<br> expression: `column`,<br> type: Integer,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_as_integer`],<br>),<br>)
* **Keep remaining columns:** false
* **Keep matched columns:** true

**Input:**

| id | distance |
| ----- | ----- |
| 1 | 2000 |

**Output:**

| distance\_as\_integer | distance |
| ----- | ----- |
| 2000 | 2000 |

***

### Example 4: Edge case

**Description:** When keeping matching columns but the projected column overrides the existing column, then the matched column isn't kept. In order to keep the original column, you must rename the projected column to a new name.

**Argument values:**

* **Condition for columns to project:** <br>columnHasType(<br> type: String,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expression to apply:** <br>cast(<br> expression: `column`,<br> type: Integer,<br>)
* **Keep remaining columns:** false
* **Keep matched columns:** true

**Input:**

| id | distance |
| ----- | ----- |
| 1 | 2000 |

**Output:**

| distance |
| ----- |
| 2000 |

***

### Example 5: Edge case

**Description:** You can choose to keep only the columns that are projected.

**Argument values:**

* **Condition for columns to project:** <br>columnHasType(<br> type: String,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expression to apply:** <br>dynamicAlias(<br> expression: <br>cast(<br> expression: `column`,<br> type: Integer,<br>),<br> transformer: <br>columnNameConcat(<br> inputs: \[`column`, `_as_integer`],<br>),<br>)
* **Keep remaining columns:** false
* **Keep matched columns:** false

**Input:**

| id | distance |
| ----- | ----- |
| 1 | 2000 |

**Output:**

| distance\_as\_integer |
| ----- |
| 2000 |

***

### Example 6: Edge case

**Description:** You can choose to keep only remaining columns that did not match the condition.

**Argument values:**

* **Condition for columns to project:** <br>columnHasType(<br> type: String,<br>)
* **Dataset:** ri.foundry.main.dataset.a
* **Expression to apply:** <br>cast(<br> expression: `column`,<br> type: Integer,<br>)
* **Keep remaining columns:** true
* **Keep matched columns:** false

**Input:**

| id | distance |
| ----- | ----- |
| 1 | 2000 |

**Output:**

| distance | id |
| ----- | ----- |
| 2000 | 1 |

***
