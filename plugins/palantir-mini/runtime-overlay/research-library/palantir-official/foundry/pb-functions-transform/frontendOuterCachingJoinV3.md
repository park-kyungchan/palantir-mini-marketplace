---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/frontendOuterCachingJoinV3/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/frontendOuterCachingJoinV3/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d96cf7859e6693465bdf3571808236920db1a9766e55caa40590ded1ddb9232e"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Outer caching join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Outer caching join

> Supported in: Streaming

Rows from the left & right inputs which meet all of the match conditions and are within the caching window, along with unmatched rows from both inputs.

**Transform categories**: Join

## Declared arguments

* **Default cache time unit:** Default unit for amount of time data will be cached for before eviction for both the lhs and rhs cache.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Default cache time value:** Default value for the amount of time data will be cached for before eviction for both the lhs and rhs cache.<br>*Literal\<Long>*
* **Join key:** A list of columns from left and right input to join on.<br>*List\<Tuple\<Column\<AnyType>, Column\<AnyType>>>*
* **Left columns to keep:** Left columns to keep.<br>*List\<Column\<AnyType>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right columns to keep:** Right columns to keep.<br>*List\<Column\<AnyType>>*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix for columns from right.<br>*Literal\<String>*
* *optional* **Rhs cache time override:** Value and unit of time that data from the rhs dataset will be cached for before eviction.<br>*Tuple\<Literal\<Long>, Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>>*
