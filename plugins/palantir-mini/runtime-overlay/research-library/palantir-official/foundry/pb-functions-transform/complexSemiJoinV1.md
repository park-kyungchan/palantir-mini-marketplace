---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/complexSemiJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/complexSemiJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "126eb35ef63055ca9f4bd6b8c03506ae6ed9db22838064ff1cb82451c31ccb81"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Semi join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Semi join

> Supported in: Batch, Faster

Semi joins left and right dataset inputs together. This removes all rows that don't match the join condition.

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
| XB-123 | foundry air |
| MT-222 | new airline |
| XB-123 | foundry airline |
| MT-222 | new air |
| KK-452 | new air |
| XB-123 | foundry airline |

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
| KK-452 | new air | 1 |

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
| XB-123 | foundry air | 2 |
| XB-123 | foundry airline | 2 |

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
| XB-123 | foundry air | 124 | 2 |
| MT-222 | new airline | 1123 | 5 |
| XB-123 | foundry airline | 335 | 5 |
| MT-222 | new air | 565 | 4 |
| KK-452 | new air | 222 | 1 |
| XB-123 | foundry airline | 1134 | 2 |

***
