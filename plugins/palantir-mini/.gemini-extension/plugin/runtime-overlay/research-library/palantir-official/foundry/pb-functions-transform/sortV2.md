---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/sortV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/sortV2/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6bacefa8c5bc023d00c51b3552b53be00c9f1e1bbaa8adf07a3309d9def03d83"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Sort"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sort

> Supported in: Batch, Faster

Transforms input dataset either by selecting columns or applying functions to columns.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to sort.<br>*Table*
* **Sort specification:** Specification for how to sort the dataset.<br>*List\<Tuple\<Column\<ComparableType>, Enum\<Ascending, Descending>>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Sort specification:** \[(`b`, `DESCENDING`)]

**Input:**

| a | b |
| ----- | ----- |
| 1 | 2 |
| 3 | 4 |
| 5 | 6 |

**Output:**

| a | b |
| ----- | ----- |
| 5 | 6 |
| 3 | 4 |
| 1 | 2 |

***
