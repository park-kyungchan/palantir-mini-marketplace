---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/coalesceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/coalesceV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "74ccedeb7b1584132385fc014f0169762258e99f6e055938cc5dcb69fe25d45a"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Coalesce data"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Coalesce data

> Supported in: Batch, Faster

Operation to reduce the number of partitions. If you have 1000 partitions and you coalesce to 100 there will not be a shuffle, instead each of the 100 new partitions will claim 10 of the current partitions. If a larger number of partitions is requested, it will stay at the current number of partitions.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to perform coalesce on.<br>*Table*
* **Number of partitions:** Number of partitions to coalesce to.<br>*Literal\<Integer>*
