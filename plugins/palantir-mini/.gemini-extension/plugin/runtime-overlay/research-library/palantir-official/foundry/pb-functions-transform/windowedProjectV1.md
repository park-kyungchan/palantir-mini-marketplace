---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/windowedProjectV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/windowedProjectV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "794e0618015052f5fb452d54de5cb29029d5962afb8ac89cc3ed5b5757cb5b8b"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Project over window"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Project over window

> Supported in: Batch, Faster, Streaming

Performs the specified aggregations on the data within the window. Emits one row each time a new row is received.

**Transform categories**: Aggregate

## Declared arguments

* **Dataset:** Dataset to perform aggregations on.<br>*Table*
* **Expressions:** List of expressions to evaluate over the window.<br>*List\<Expression\<AnyType>>*
* **Window:** Window to group data by.<br>*Window*
