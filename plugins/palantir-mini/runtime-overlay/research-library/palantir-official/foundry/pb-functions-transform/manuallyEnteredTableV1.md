---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/manuallyEnteredTableV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/manuallyEnteredTableV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a057551a1c033136cc3fcbe89caa7d80dc8b4cb44700319c60101174dee36ab3"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Manually entered table"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manually entered table

> Supported in: Batch, Faster, Streaming

Uses manually entered table data to create an output.

**Transform categories**: Other

## Declared arguments

* **Rows:** A list of structs representing rows, with struct fields representing column names and values.<br>*List\<Literal\<Struct>>*
* *optional* **Schema:** A schema to be used if present for column names and types. If undefined, rows must be nonempty and will be used to infer the schema.<br>*Type\<Struct>*

## Examples

### Example 1: Base case

**Argument values:**

* **Rows:** \[{<br> **airline**: foundry airlines,<br> **flight\_code**: 112,<br> **flight\_number**: XB-123,<br>}, {<br> **airline**: foundry airlines,<br> **flight\_code**: 533,<br> **flight\_number**: MT-444,<br>}, {<br> **airline**: new air,<br> **flight\_code**: 934,<br> **flight\_number**: KK-123,<br>}]
* **Schema:** Struct\<flight\_code:Integer, flight\_number:String, airline:String>

**Inputs:**

**Output:**

| flight\_code | flight\_number | airline |
| ----- | ----- | ----- |
| 112 | XB-123 | foundry airlines |
| 533 | MT-444 | foundry airlines |
| 934 | KK-123 | new air |

***
