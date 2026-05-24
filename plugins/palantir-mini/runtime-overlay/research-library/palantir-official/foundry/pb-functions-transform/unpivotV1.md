---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/unpivotV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/unpivotV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a03b77c4b8ff0c90a518a2d6430fb5ef4d6b9b14b4e3e8d146fc8db7ec1c4cd3"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Unpivot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Unpivot

> Supported in: Batch, Faster, Streaming

Unpivot is the opposite operation of pivot. This converts multiple columns into rows, transforming data from a wide format to a long format. To do so it creates two new columns: one containing the original column names as values, and another containing the corresponding data values. All other columns that are not unpivoted are kept as is.

**Transform categories**: Aggregate, Popular

## Declared arguments

* **Columns to unpivot:** List of columns to unpivot.<br>*List\<Column\<T>>*
* **Dataset:** Dataset to perform unpivot on.<br>*Table*
* **Name column:** The output column that contains the column names from the original dataset.<br>*Literal\<String>*
* **Value column:** The output column that contains the values from the original dataset.<br>*Literal\<String>*

**Type variable bounds:** *T accepts AnyType*

## Examples

### Example 1: Base case

**Argument values:**

* **Columns to unpivot:** \[`new_york_miles`, `london_miles`]
* **Dataset:** ri.foundry.main.dataset.a
* **Name column:** city
* **Value column:** miles

**Input:**

| airline | new\_york\_miles | london\_miles |
| ----- | ----- | ----- |
| foundry airways | 1000 | 6000 |
| new air | *null* | 8000 |

**Output:**

| city | miles | airline |
| ----- | ----- | ----- |
| new\_york\_miles | 1000 | foundry airways |
| london\_miles | 6000 | foundry airways |
| new\_york\_miles | *null* | new air |
| london\_miles | 8000 | new air |

***

### Example 2: Base case

**Argument values:**

* **Columns to unpivot:** \[`new_york_miles`, `london_miles`]
* **Dataset:** ri.foundry.main.dataset.a
* **Name column:** city
* **Value column:** miles

**Input:**

| airline | new\_york\_miles | london\_miles | miles |
| ----- | ----- | ----- | ----- |
| foundry airways | 1000 | 6000 | 0 |
| new air | *null* | 8000 | 0 |

**Output:**

| city | miles | airline |
| ----- | ----- | ----- |
| new\_york\_miles | 1000 | foundry airways |
| london\_miles | 6000 | foundry airways |
| new\_york\_miles | *null* | new air |
| london\_miles | 8000 | new air |

***
