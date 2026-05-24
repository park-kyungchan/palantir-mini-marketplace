---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/unionByNameV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/unionByNameV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6168b7b984c59d906a5304db166ee1f1733404b386ca9f7cfa02f0ca18b914dd"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Union by name"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Union by name

> Supported in: Batch, Faster, Streaming

Unions a set of datasets together on matching column names.

**Transform categories**: Join

## Declared arguments

* **Datasets to union:** The datasets being unioned together.<br>*List\<Table>*

## Examples

### Example 1: Base case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

ri.foundry.main.dataset.b

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | AA-200 | AA |
| true | BN-435 | BN |
| true | BN-111 | BN |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |
| true | AA-200 | AA |
| true | BN-435 | BN |
| true | BN-111 | BN |

***
