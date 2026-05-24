---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/narrowUnionByNameV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/narrowUnionByNameV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "290829ada7ca542e42577da788ecdcde5b91464d9353737c87bf3011cc86dfe4"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Narrow union by name"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Narrow union by name

> Supported in: Batch, Faster

Unions a set of datasets together on the intersection of their column names, columns that are not present in all input datasets are removed.

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

| recently\_serviced | tail\_number |
| ----- | ----- |
| true | KK-150 |
| false | XB-120 |
| true | MT-190 |
| true | AA-200 |
| true | BN-435 |
| true | BN-111 |

***
