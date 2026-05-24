---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/lazOuterCachingJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/lazOuterCachingJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dab7265d58ecda22481a9338b5f6b918b1b0974d6b1d47b706844bfc357d4ac4"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Lazarus outer caching join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Lazarus outer caching join

> Supported in: Streaming

Joins left and right dataset inputs together, caching the record with the highest event time from each side for use in subsequent joins. Processing time of a record is used as a tiebreaker. In the case of a time results are optimistically emitted if there's no value to join against.

**Transform categories**: Join

## Declared arguments

* **Default cache time unit:** Default unit for amount of time data will be cached for before eviction for both the lhs and rhs cache.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Default cache time value:** Default value for the amount of time data will be cached for before eviction for both the lhs and rhs cache.<br>*Literal\<Long>*
* **Join key:** A list of columns from left and right input to join on.<br>*List\<Tuple\<Column\<AnyType>, Column\<AnyType>>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Rhs cache time override:** Value and unit of time that data from the rhs dataset will be cached for before eviction. If cache time is set to 0, the rhs will not cache. If you want the lhs to be uncached, set the default cache time to 0 and override with this parameter.<br>*Tuple\<Literal\<Long>, Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>>*
