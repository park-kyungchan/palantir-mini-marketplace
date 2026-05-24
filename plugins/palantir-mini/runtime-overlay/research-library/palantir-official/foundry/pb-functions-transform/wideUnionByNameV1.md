---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/wideUnionByNameV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/wideUnionByNameV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8514ef459a2c99a2366e9cc34beb33f4003c8f47a02b1fd47dc626daaf11905b"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Wide union by name"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Wide union by name

> Supported in: Batch, Faster, Streaming

Unions a set of datasets together on the superset of their column names, adding nulls when columns are missing.

**Transform categories**: Join

## Declared arguments

* **Datasets to union:** The datasets being unioned together.<br>*List\<Table>*

## Examples

### Example 1: Base case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number |
| ----- | ----- |
| true | KK-150 |
| false | XB-120 |
| true | MT-190 |

ri.foundry.main.dataset.b

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | AA-200 | AA |
| true | BN-435 | BN |
| true | BN-111 | BN |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | *null* |
| false | XB-120 | *null* |
| true | MT-190 | *null* |
| true | AA-200 | AA |
| true | BN-435 | BN |
| true | BN-111 | BN |

***
