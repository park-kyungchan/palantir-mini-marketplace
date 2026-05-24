---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/outerCachingJoinV3/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/outerCachingJoinV3/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "12628e1827ced7885d8fa450a03c65c197c932bf42b99ac2f352f003c1492203"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Outer caching join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Outer caching join

> Supported in: Streaming

Joins left and right dataset inputs together, caching the record with the highest event time from each side for use in subsequent joins. Processing time of a record is used as a tiebreaker. In the case of a time results are optimistically emitted if there's no value to join against.

**Transform categories**: Join

## Declared arguments

* **Default cache time unit:** Default unit for amount of time data will be cached for before eviction for both the lhs and rhs cache.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Default cache time value:** Default value for the amount of time data will be cached for before eviction for both the lhs and rhs cache.<br>*Literal\<Long>*
* **Join key:** A list of columns from left and right input to join on.<br>*List\<Tuple\<Column\<Binary | Boolean | Byte | Double | Float | Integer | Long | Short | String | Timestamp>, Column\<Binary | Boolean | Byte | Double | Float | Integer | Long | Short | String | Timestamp>>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Rhs cache time override:** Value and unit of time that data from the rhs dataset will be cached for before eviction. If cache time is set to 0, the rhs will not cache. If you want the lhs to be uncached, set the default cache time to 0 and override with this parameter.<br>*Tuple\<Literal\<Long>, Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>>*
