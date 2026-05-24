---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/renameColumnsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/renameColumnsV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "97951f7640bb4b63b9b39ef04b8297582d46a471e9e0dc5103402a1448fd507d"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Rename columns"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Rename columns

> Supported in: Batch, Faster, Streaming

Renames a set of columns.

**Transform categories**: Data preparation, Popular

## Declared arguments

* **Input dataset:** Source dataset containing columns to be renamed.<br>*Table*
* **Renames:** Renames from existing column names to new names.<br>*List\<Tuple\<Column\<AnyType>, Literal\<String>>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Renames:** \[(`recently_serviced`, does\_not\_require\_service)]

**Input:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

**Output:**

| does\_not\_require\_service | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

***
