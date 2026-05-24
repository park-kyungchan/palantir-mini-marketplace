---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/complexAntiJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/complexAntiJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "38fcdb2ae1cb0cf6f8e9b844f8241a3ed81b4d0e26cfb4de07f6bd8c16af1324"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Anti join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Anti join

> Supported in: Batch, Faster

Anti joins left and right dataset inputs, removing all rows from the left relation that match the provided condition.

**Transform categories**: Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Join condition:** Condition on which to join.<br>*Expression\<Boolean>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline],<br>)
* **Join condition:** <br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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

| tail\_number | airline |
| ----- | ----- |
| PA-452 | new air |

***

### Example 2: Base case

**Description:** Simple complex join condition.

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline, factor],<br>)
* **Join condition:** <br>and(<br> conditions: \[<br>lessThan(<br> left: `factor`,<br> right: `factor`,<br>), <br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>)],<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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

| tail\_number | airline | factor |
| ----- | ----- | ----- |
| XB-123 | foundry air | 2 |
| MT-222 | new airline | 5 |
| XB-123 | foundry airline | 5 |
| MT-222 | new air | 4 |
| PA-452 | new air | 2 |
| XB-123 | foundry airline | 2 |

***

### Example 3: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[tail\_number, airline, factor],<br>)
* **Join condition:** <br>and(<br> conditions: \[<br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>), <br>equals(<br> left: `factor`,<br> right: `factor`,<br>)],<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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

| tail\_number | airline | factor |
| ----- | ----- | ----- |
| MT-222 | new airline | 5 |
| XB-123 | foundry airline | 5 |
| MT-222 | new air | 4 |
| KK-452 | new air | 1 |
| PA-452 | new air | 2 |

***

### Example 4: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Join condition:** <br>equals(<br> left: `tail_number`,<br> right: `tail_number`,<br>)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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

| tail\_number | airline | miles | factor |
| ----- | ----- | ----- | ----- |
| PA-452 | new air | 212 | 2 |

***
