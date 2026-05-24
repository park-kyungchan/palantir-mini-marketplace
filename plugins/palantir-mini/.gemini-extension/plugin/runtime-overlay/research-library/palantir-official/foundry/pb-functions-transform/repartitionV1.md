---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/repartitionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/repartitionV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9f16947a49860e5cc416546f70fe77cc301b035867f45067d5c8e4b818ba0cbe"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Repartition data"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Repartition data

> Supported in: Batch, Faster

Forces a shuffle of the data based on optionally provided partitioning columns and a resulting number of partitions. If these are not provided, the partitioning will be determined automatically.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to perform aggregate on.<br>*Table*
* *optional* **Incremental partition count:** Number of partitions to reshuffle to if the build is incrementally updated.<br>*Literal\<Integer>*
* *optional* **Number of partitions:** Number of partitions to reshuffle to.<br>*Literal\<Integer>*
* *optional* **Partitioning columns:** Specifies the list of columns to be used for repartitioning.<br>*List\<Column\<AnyType>>*
