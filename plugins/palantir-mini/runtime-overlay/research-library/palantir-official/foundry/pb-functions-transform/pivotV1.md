---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/pivotV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/pivotV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5b6502e06d5bb8f47dbeeedc0164e95a31f0a7d5bea3d7c09ba2b2ca13c89234"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Pivot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Pivot

> Supported in: Batch, Faster

Performs the specified aggregations on the input dataset grouped by a set of columns. Unique values to pivot on must be provided such that the output schema is known ahead of runtime. This improves runtime stability over time.

**Transform categories**: Aggregate, Popular

## Declared arguments

* **Aggregations:** List of aggregations to perform on the dataset.<br>*List\<Expression\<AnyType>>*
* **Dataset:** Dataset to perform aggregate on.<br>*Table*
* **Group by columns:** List of columns to group the dataset by when aggregating.<br>*List\<Column\<AnyType>>*
* **Pivot by column:** Column to pivot on.<br>*Column\<T>*
* **Pivot by values:** List of unique values used to pivot and aliases for the output. Alias values are used to construct the output column name according to the prefix / suffix argument.<br>*List\<Tuple\<Literal\<T>, Literal\<String>>>*
* *optional* **Prefix or suffix alias:** If prefix, the output column name will be 'alias'*'aggregate', if suffix it will be 'aggregate'*`alias`.<br>*Enum\<Prefix, Suffix>*

**Type variable bounds:** *T accepts Boolean | Byte | Integer | Long | Short | String*

## Examples

### Example 1: Base case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: miles,<br> expression: <br>mean(<br> expression: `miles`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.a
* **Group by columns:** \[`airline`]
* **Pivot by column:** `airport`
* **Pivot by values:** \[(JFK, new\_york), (LHR, london)]
* **Prefix or suffix alias:** *null*

**Input:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | JFK | 1002345 |
| foundry airways | LHR | 2221324 |
| new air | SFO | 21356673 |
| new air | JFK | 12323456 |
| foundry airways | LHR | 12542352 |
| new air | JFK | 12232355 |

**Output:**

| airline | new\_york\_miles | london\_miles |
| ----- | ----- | ----- |
| foundry airways | 1002345.0 | 7381838.0 |
| new air | 1.22779055E7 | *null* |

***

### Example 2: Base case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: miles,<br> expression: <br>mean(<br> expression: `miles`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.a
* **Group by columns:** \[`airline`]
* **Pivot by column:** `airport`
* **Pivot by values:** \[(JFK, new\_york), (LHR, london)]
* **Prefix or suffix alias:** `SUFFIX`

**Input:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | JFK | 1002345 |
| foundry airways | LHR | 2221324 |
| new air | SFO | 21356673 |
| new air | JFK | 12323456 |
| foundry airways | LHR | 12542352 |
| new air | JFK | 12232355 |

**Output:**

| airline | miles\_new\_york | miles\_london |
| ----- | ----- | ----- |
| foundry airways | 1002345.0 | 7381838.0 |
| new air | 1.22779055E7 | *null* |

***
