---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/keyByV3/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/keyByV3/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d590d6a1bc41149cc8d3644b1ad650c77f0fc66b7528874792e02d1a27eeb388"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Key by"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Key by

> Supported in: Streaming

Keys the input by the provided key by columns. Note that this does not re-sort the data and only maintains per key ordering from the point the keys are set. Re-keying data may be unsafe in that if the newly keyed data was depending on any specific ordering then we can't guarantee that ordering if it wasn't already maintained by the previous keying. Additionally sets the primary key if cdc (change data capture) mode is enabled. Primary key defines columns that indicate which rows are updates, deletes, and the ordering of when read as a current view.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to perform key by on.<br>*Table*
* **Enable cdc mode:** If false, only the partition columns are set which control ordering guarantee; rows with the same values for all key columns will be output in the same order they are received. If true both partition columns and primary key are set, which in addition to modifying the ordering guarantee also sets the configuration for how to de-duplicate rows with the same values for all key columns.<br>*Literal\<Boolean>*
* **Key by columns:** Columns on which to partition the input by key. If change data capture is enabled (by specifying primary key parameters), these columns will also be used to defines updates. A row is considered an update if its key values exactly match the key values of a previous row.<br>*Set\<Column\<Binary | Boolean | Byte | Double | Float | Integer | Long | Short | String | Timestamp>>*
* *optional* **Primary key is deleted column:** Requires cdc mode enabled. Used in change data capture to define deletes. A row is considered a delete if its deleted column value is set to true, and the key columns exactly match a row to be deleted.<br>*Column\<Boolean>*
* *optional* **Primary key ordering columns:** Requires cdc mode enabled. Recommended to leave blank for streams. Used in change data capture to define ordering for batch and archive datasets. A row may only be an update or delete if it comes after the row it is trying to modify. If left blank and in streaming cdc mode, the most recently streamed row will always win.<br>*List\<Column\<Byte | Date | Decimal | Integer | Long | Short | String | Timestamp>>*
