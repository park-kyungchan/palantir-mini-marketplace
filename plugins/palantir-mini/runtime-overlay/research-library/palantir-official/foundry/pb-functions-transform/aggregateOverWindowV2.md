---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/aggregateOverWindowV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/aggregateOverWindowV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1c52c7150c119b7b7e67aa3dc0e2b07465b9fb363a9eb6af34bcd9dcc3f98e7e"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Aggregate over window"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Aggregate over window

> Supported in: Streaming

Performs the specified aggregations on the data within a window, emitting outputs as specified by the provided trigger.

**Transform categories**: Aggregate

## Declared arguments

* **Aggregate expressions:** List of aggregate expressions to evaluate over each window.<br>*List\<Expression\<AnyType>>*
* **Dataset:** Dataset to perform aggregations on.<br>*Table*
* **Window:** Window defining how elements should be grouped.<br>*Window*
* *optional* **Accumulation mode:** The accumulation mode for the window. Determines whether the window accumulates panes when the trigger fires or discards them.<br>*Enum\<Accumulating, Discarding>*
* *optional* **Key by columns:** Columns on which to partition the input by key. Each aggregation will be computed separately for each distinct key value.<br>*Set\<Column\<Binary | Boolean | Byte | Double | Float | Integer | Long | Short | String | Timestamp>>*
* *optional* **Trigger:** Trigger defining when aggregation should be performed.<br>*Trigger*
