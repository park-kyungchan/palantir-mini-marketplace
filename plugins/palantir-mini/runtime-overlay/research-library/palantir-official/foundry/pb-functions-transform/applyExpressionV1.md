---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/applyExpressionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/applyExpressionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "57090ae2e6bf7704c45ffb10df69b32f39df885474d5ce1701e846139b0cf376"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Apply expression"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Apply expression

> Supported in: Batch, Faster, Streaming

Transforms input dataset by applying a single expression.

**Transform categories**: Popular

## Declared arguments

* **Dataset:** Dataset to apply expression to.<br>*Table*
* **Expression:** Expression to apply.<br>*Expression\<AnyType>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Expression:** <br>alias(<br> alias: kilometers,<br> expression: <br>convertDistance(<br> amount: `miles`,<br> currentUnit: `mile`,<br> targetUnit: `kilometer`,<br>),<br>)

**Input:**

| airline | miles |
| ----- | ----- |
| foundry airways | 2500 |
| new air | 3000 |

**Output:**

| kilometers | airline | miles |
| ----- | ----- | ----- |
| 4023.36 | foundry airways | 2500 |
| 4828.03 | new air | 3000 |

***
