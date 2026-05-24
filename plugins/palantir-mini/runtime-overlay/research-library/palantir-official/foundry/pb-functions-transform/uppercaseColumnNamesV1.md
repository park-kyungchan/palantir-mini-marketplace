---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/uppercaseColumnNamesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/uppercaseColumnNamesV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ec513844e43c2a86e8ae6d0a6bac01450370c1e22704e7f845411d6d9ae23b6a"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Uppercase column names"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Uppercase column names

> Supported in: Batch, Faster, Streaming

Uppercases all column names in the dataset.

**Transform categories**: Data preparation

## Declared arguments

* **Dataset:** Dataset to uppercase column names.<br>*Table*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| recentlyServiced | tailNumber | airlineCode |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

**Output:**

| RECENTLYSERVICED | TAILNUMBER | AIRLINECODE |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

***

### Example 2: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a

**Input:**

| first\_name | last\_name | email\_address |
| ----- | ----- | ----- |
| John | Doe | john@example.com |
| Jane | Smith | jane@example.com |

**Output:**

| FIRST\_NAME | LAST\_NAME | EMAIL\_ADDRESS |
| ----- | ----- | ----- |
| John | Doe | john@example.com |
| Jane | Smith | jane@example.com |

***
