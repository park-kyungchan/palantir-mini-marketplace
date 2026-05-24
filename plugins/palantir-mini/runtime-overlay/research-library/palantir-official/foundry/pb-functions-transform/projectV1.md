---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/projectV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/projectV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c7473c3b8020bebde18c69a9e03434531a1535f8434067e5c8dab33b4146cd49"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Apply multiple expressions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Apply multiple expressions

> Supported in: Batch, Faster, Streaming

Transforms input dataset either by selecting columns or applying functions to columns.

**Transform categories**: Popular

## Declared arguments

* **Columns:** List of column transformations to apply to the dataset.<br>*List\<Expression\<AnyType>>*
* **Dataset:** Dataset to apply operations to.<br>*Table*
* **Keep remaining columns:** Keeps all columns not projected in the dataset.<br>*Literal\<Boolean>*

## Examples

### Example 1: Base case

**Argument values:**

* **Columns:** \[<br>alias(<br> alias: airline,<br> expression: `airline`,<br>)]
* **Dataset:** ri.foundry.main.dataset.a
* **Keep remaining columns:** false

**Input:**

| airline | miles |
| ----- | ----- |
| foundry airways | 2500 |
| new air | 3000 |

**Output:**

| airline |
| ----- |
| foundry airways |
| new air |

***

### Example 2: Edge case

**Argument values:**

* **Columns:** \[<br>alias(<br> alias: media\_column,<br> expression: media\_ref,<br>)]
* **Dataset:** ri.foundry.main.dataset.a
* **Keep remaining columns:** false

**Input:**

| pk |
| ----- |
| 1 |

**Output:**

| media\_column |
| ----- |
| media\_ref |

***
