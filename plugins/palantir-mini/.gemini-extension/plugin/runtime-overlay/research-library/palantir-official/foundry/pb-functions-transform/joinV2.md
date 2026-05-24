---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/joinV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/joinV2/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bbacb57a3aea64bba67cdd259905fb2a0a4572f5e7de87efed9197f79a11158a"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Join

> Supported in: Batch, Faster, Streaming

Joins left and right dataset inputs together.

**Transform categories**: Join

## Declared arguments

* **Join key:** A list of columns from left and right input to join on.<br>*List\<Tuple\<Column\<AnyType>, Column\<AnyType>>>*
* **Join type:** The type of join to perform.<br>*Enum\<Anti join, Cross join, Full outer join, Inner join, Left join, Right join, Semi join>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*
