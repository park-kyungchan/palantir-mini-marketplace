---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/arrayToColumnsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/arrayToColumnsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "04fe9be6b059e5e5cec980d20d63fb6bb6f4c860a998cd8aa7cdfa87e0acec16"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Array elements to columns"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array elements to columns

> Supported in: Batch, Faster

Extracts elements from an array into columns.

**Transform categories**: Array

## Declared arguments

* **Array:** The array to extract columns from.<br>*Expression\<Array\<AnyType>>*
* **Columns to extract:** List of columns names.<br>*List\<Literal\<String>>*
* **Dataset:** Dataset to drop columns from.<br>*Table*

## Examples

### Example 1: Base case

**Argument values:**

* **Array:** `stats`
* **Columns to extract:** \[miles, id]
* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| stats |
| ----- |
| \[ 1000, 2 ] |

**Output:**

| miles | id | stats |
| ----- | ----- | ----- |
| 1000 | 2 | \[ 1000, 2 ] |

***

### Example 2: Base case

**Argument values:**

* **Array:** `stats`
* **Columns to extract:** \[miles, id]
* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| stats |
| ----- |
| \[ 1000, 2, 10 ] |
| \[ 2000 ] |

**Output:**

| miles | id | stats |
| ----- | ----- | ----- |
| 1000 | 2 | \[ 1000, 2, 10 ] |
| 2000 | *null* | \[ 2000 ] |

***

### Example 3: Base case

**Argument values:**

* **Array:** `stats`
* **Columns to extract:** \[miles, id]
* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| stats | miles |
| ----- | ----- |
| \[ 1000, 2 ] | 30 |

**Output:**

| miles | id | stats |
| ----- | ----- | ----- |
| 1000 | 2 | \[ 1000, 2 ] |

***

### Example 4: Base case

**Argument values:**

* **Array:** `stats`
* **Columns to extract:** \[miles, id]
* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| stats | miles |
| ----- | ----- |
| \[ 1000, 2 ] | test\_string |

**Output:**

| miles | id | stats |
| ----- | ----- | ----- |
| 1000 | 2 | \[ 1000, 2 ] |

***

### Example 5: Null case

**Argument values:**

* **Array:** `stats`
* **Columns to extract:** \[miles, id]
* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| stats |
| ----- |
| \[ *null*, *null* ] |
| *null* |

**Output:**

| miles | id | stats |
| ----- | ----- | ----- |
| *null* | *null* | \[ *null*, *null* ] |
| *null* | *null* | *null* |

***
