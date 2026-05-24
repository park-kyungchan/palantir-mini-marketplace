---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/newOperatorChainV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/newOperatorChainV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "16efb964a4d4801b8349e1d55466963cea69a8d747c95d521039245824fa4846"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > New operator chain"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# New operator chain

> Supported in: Streaming

Advanced flink feature, starts new operator chain here.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to create new operator chain after.<br>*Table*
* *optional* **Slot sharing group:** Optional slot sharing group. Advanced flink concept to control which slot / task manager this operator chain is scheduled on.<br>*Literal\<String>*
