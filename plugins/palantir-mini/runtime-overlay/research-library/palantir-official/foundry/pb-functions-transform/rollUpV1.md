---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/rollUpV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/rollUpV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c27393280c1bb437920ce4d4a31554d82521b9cd7b5968a9d2fa2adcf75de6b1"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Rollup"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Rollup

> Supported in: Batch, Faster

Performs the specified aggregations on the input dataset at different levels of granularity, providing both intermediate and super aggregates.

**Transform categories**: Aggregate

## Declared arguments

* **Aggregations:** List of aggregations to perform on the dataset.<br>*List\<Expression\<AnyType>>*
* **Dataset:** Dataset to perform rollup on.<br>*Table*
* **Rollup columns:** List of columns to rollup the dataset by when aggregating. If empty, no roll up is applied.<br>*List\<Column\<AnyType>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: max\_price,<br> expression: <br>max(<br> expression: `price`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.rollupBaseCase
* **Rollup columns:** \[`city`]

**Input:**

| city | model | price | store |
| ----- | ----- | ----- | ----- |
| London | new phone | 900.0 | MegaMart |
| London | new phone | 850.75 | AA |
| London | new phone | 870.75 | ABC Zone |
| San Francisco | new phone | 1000.0 | Prescos |
| San Francisco | new phone | 950.25 | XZY Force |
| San Francisco | new phone | 1105.7 | Phone Mart |
| London | forestX 20 | 750.1 | MegaMart |
| London | forestX 20 | 690.0 | AA |
| London | forestX 20 | 730.0 | ABC Zone |
| San Francisco | forestX 20 | 890.4 | Prescos |
| San Francisco | forestX 20 | 900.1 | XZY Force |
| San Francisco | forestX 20 | 1050.75 | Phone Mart |

**Output:**

| city | max\_price |
| ----- | ----- |
| London | 900.0 |
| San Francisco | 1105.7 |
| *null* | 1105.7 |

***

### Example 2: Base case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: mean\_price,<br> expression: <br>mean(<br> expression: `price`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.rollupBaseCase
* **Rollup columns:** \[`city`, `model`]

**Input:**

| city | model | price | store |
| ----- | ----- | ----- | ----- |
| London | new phone | 900.0 | MegaMart |
| London | new phone | 850.75 | AA |
| London | new phone | 870.75 | ABC Zone |
| San Francisco | new phone | 1000.0 | Prescos |
| San Francisco | new phone | 950.25 | XZY Force |
| San Francisco | new phone | 1105.7 | Phone Mart |
| London | forestX 20 | 750.1 | MegaMart |
| London | forestX 20 | 690.0 | AA |
| London | forestX 20 | 730.0 | ABC Zone |
| San Francisco | forestX 20 | 890.4 | Prescos |
| San Francisco | forestX 20 | 900.1 | XZY Force |
| San Francisco | forestX 20 | 1050.75 | Phone Mart |

**Output:**

| city | model | mean\_price |
| ----- | ----- | ----- |
| London | new phone | 873.8333333333334 |
| London | forestX 20 | 723.3666666666667 |
| London | *null* | 798.6 |
| San Francisco | new phone | 1018.65 |
| San Francisco | forestX 20 | 947.0833333333334 |
| San Francisco | *null* | 982.8666666666667 |
| *null* | *null* | 890.7333333333335 |

***

### Example 3: Base case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: max\_price,<br> expression: <br>max(<br> expression: `plan_prices`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.rollupComplexCase
* **Rollup columns:** \[`model`]

**Input:**

| city | model | plan\_prices | stores |
| ----- | ----- | ----- | ----- |
| London | new phone | \[ 900.0, 1080.23, 899.99 ] | MegaMart |
| London | new phone | \[ 850.75, 800.78, 999.99 ] | AA |
| London | new phone | \[ 870.75, 775.0, 804.48 ] | ABC Zone |
| San Francisco | new phone | \[ 910.0, 1030.23, 1100.5 ] | Prescos |
| San Francisco | new phone | \[ 1020.0, 989.99, 1130.0 ] | XZY Force |
| San Francisco | new phone | \[ 1020.0, 1065.25, 1110.99 ] | Phone Mart |
| London | forestX 20 | \[ 738.5, 701.25, 834.0 ] | MegaMart |
| London | forestX 20 | \[ 703.75, 821.0, 712.5 ] | AA |
| London | forestX 20 | \[ 692.0, 787.5, 841.75 ] | ABC Zone |
| San Francisco | forestX 20 | \[ 1003.25, 997.75, 893.5 ] | Prescos |
| San Francisco | forestX 20 | \[ 981.5, 872.25, 1035.0 ] | XZY Force |
| San Francisco | forestX 20 | \[ 928.0, 995.25, 1098.5 ] | Phone Mart |

**Output:**

| model | max\_price |
| ----- | ----- |
| new phone | \[ 1020.0, 1065.25, 1110.99 ] |
| forestX 20 | \[ 1003.25, 997.75, 893.5 ] |
| *null* | \[ 1020.0, 1065.25, 1110.99 ] |

***

### Example 4: Null case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: max\_price,<br> expression: <br>max(<br> expression: `price`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.rollupNullCase
* **Rollup columns:** \[`city`, `model`]

**Input:**

| city | model | price | stores |
| ----- | ----- | ----- | ----- |
| London | new phone | *null* | MegaMart |
| London | new phone | 850.75 | AA |
| London | new phone | 870.75 | ABC Zone |
| San Francisco | new phone | *null* | Prescos |
| San Francisco | new phone | *null* | XZY Force |
| San Francisco | new phone | *null* | Phone Mart |
| London | forestX 20 | 750.1 | MegaMart |
| London | forestX 20 | 690.0 | AA |
| London | forestX 20 | *null* | ABC Zone |
| San Francisco | forestX 20 | 890.4 | Prescos |
| San Francisco | forestX 20 | *null* | XZY Force |
| San Francisco | forestX 20 | 1050.75 | Phone Mart |

**Output:**

| city | model | max\_price |
| ----- | ----- | ----- |
| London | new phone | 870.75 |
| London | forestX 20 | 750.1 |
| London | *null* | 870.75 |
| San Francisco | new phone | *null* |
| San Francisco | forestX 20 | 1050.75 |
| San Francisco | *null* | 1050.75 |
| *null* | *null* | 1050.75 |

***

### Example 5: Edge case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: mean\_price,<br> expression: <br>mean(<br> expression: `price`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.rollupBaseCase
* **Rollup columns:** \[]

**Input:**

| city | model | price | store |
| ----- | ----- | ----- | ----- |
| London | new phone | 900.0 | MegaMart |
| London | new phone | 850.75 | AA |
| London | new phone | 870.75 | ABC Zone |
| San Francisco | new phone | 1000.0 | Prescos |
| San Francisco | new phone | 950.25 | XZY Force |
| San Francisco | new phone | 1105.7 | Phone Mart |
| London | forestX 20 | 750.1 | MegaMart |
| London | forestX 20 | 690.0 | AA |
| London | forestX 20 | 730.0 | ABC Zone |
| San Francisco | forestX 20 | 890.4 | Prescos |
| San Francisco | forestX 20 | 900.1 | XZY Force |
| San Francisco | forestX 20 | 1050.75 | Phone Mart |

**Output:**

| mean\_price |
| ----- |
| 890.7333333333335 |

***

### Example 6: Edge case

**Argument values:**

* **Aggregations:** \[<br>alias(<br> alias: max\_price,<br> expression: <br>max(<br> expression: `price`,<br>),<br>)]
* **Dataset:** ri.foundry.main.dataset.rollupEmptyCase
* **Rollup columns:** \[`city`, `model`]

**Input:**

| city | model | price | store |
| ----- | ----- | ----- | ----- |

**Output:**

| city | model | max\_price |
| ----- | ----- | ----- |

***
