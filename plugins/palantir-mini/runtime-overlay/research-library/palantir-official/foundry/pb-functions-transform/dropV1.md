---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/dropV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/dropV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ddf574ad6773b0c179be3c248812277787a6577bd3d712f1ff4cf05671a364a0"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Drop columns"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Drop columns

> Supported in: Batch, Faster, Streaming

Transforms input dataset by dropping the specified columns.

**Transform categories**: Popular

## Declared arguments

* **Columns to drop:** List of columns to drop.<br>*Set\<Column\<AnyType>>*
* **Dataset:** Dataset to drop columns from.<br>*Table*

## Examples

### Example 1: Base case

**Argument values:**

* **Columns to drop:** {`miles`}
* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| airline | miles | airports |
| ----- | ----- | ----- |
| foundry airways | 3000 | \[ JFK, SFO ] |

**Output:**

| airline | airports |
| ----- | ----- |
| foundry airways | \[ JFK, SFO ] |

***
