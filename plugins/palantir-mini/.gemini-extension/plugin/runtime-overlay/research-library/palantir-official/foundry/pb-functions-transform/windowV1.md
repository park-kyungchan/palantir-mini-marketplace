---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/windowV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/windowV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f05290f4f4c7e37027302abca72bd65d2605836827028d7cfae9c4d75e0300d1"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Window"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Window

> Supported in: Batch, Faster

Performs the specified aggregations on the input dataset grouped by a set of columns.

**Transform categories**: Aggregate, Popular

## Declared arguments

* **Dataset:** Dataset to perform aggregate on.<br>*Table*
* **Expressions:** List of expressions to evaluate over window.<br>*List\<Expression\<AnyType>>*
* **Window:** Window to operate over.<br>*Window*
