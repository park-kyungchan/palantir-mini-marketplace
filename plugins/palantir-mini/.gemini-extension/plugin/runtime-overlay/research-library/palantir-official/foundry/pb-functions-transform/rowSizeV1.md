---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/rowSizeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/rowSizeV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2688c6cb3966e6910e0c353c11e5a61eca60f5b1e925c572825269f3c7420187"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Row size"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Row size

> Supported in: Batch

Estimates the size of a single row in the JVM.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to calculate size of an individual row.<br>*Table*
* *optional* **Row size column alias:** Name of the column for the row estimate size value in bytes, defaults to 'size'.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Row size column alias:** size

**Input:**

| a |
| ----- |
| 1 |

**Output:**

| a | size |
| ----- | ----- |
| 1 | 16 |

***
