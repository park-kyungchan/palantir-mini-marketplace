---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/timeBoundedDropOutOfOrderTransformV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/timeBoundedDropOutOfOrderTransformV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "203af36511794bd4f60d668069a1dc865e39d6fcb8896e0efb13a743731afd32"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Time bounded drop out of order"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time bounded drop out of order

> Supported in: Streaming

Drops rows with the same values for all key columns that are out of order. A row is out of order if it would have come before an already received row with the same key values based on sort columns and directions. Two rows are compared by evaluating the first sort column and direction first, and then moving on to the next sort column and direction if and only if there was a tie, and so on until order is determined or all sort columns are tied in which case the rows are equal. The current maximum for each key is stored until no new rows have been seen for that key for an event time greater than or equal to the expiry. After a key has received no new rows for greater or equal to the expiry time, any new row for that key will be never be dropped, and will always be stored as the new current maximum.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to drop out of order rows.<br>*Table*
* **Key expiration time unit:** Unit for amount of time to store the greatest record for a given key. If state is stored for a key, and a different key is processed with a watermark greater than this expiration period, then state is expired for the key and any new records of the same key will not be dropped. For any key, a new record pushes the expiry to this amount of time in the future, whether or not it has the highest order precedence.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Key expiration time value:** Value for amount of time to store the greatest record for a given key. If state is stored for a key, and a different key is processed with a watermark greater than this expiration period, then state is expired for the key and any new records of the same key will not be dropped. For any key, a new record pushes the expiry to this amount of time in the future, whether or not it has the highest order precedence.<br>*Literal\<Long>*
* **Ordering guarantee:** Specify a column and direction that will define the order that stream elements must follow in order to not be dropped. Ascending order guarantees that incoming stream elements must be equal or increasing in value compared to all previous rows to avoid being dropped; descending order guarantees the opposite. You can specify multiple columns and directions, but columns and directions beyond the first column are only considered in the event of a tie and are consulted in order. They will not apply otherwise.<br>*List\<Tuple\<Column\<ComparableType>, Enum\<Ascending, Descending>>>*
* *optional* **Key by columns:** Columns used to partition the input by key. Rows sharing the same key column values are processed in the order they are received. The order in which rows with the same key columns are processed may differ from the order defined by the sort spec. A row is considered out of order when it ought to be placed before the state stored highest precedence already processed row with the same key, based on the sort spec. For such out-of-order rows, they are dropped during the process so long as such state for this key exists and has not expired.<br>*Set\<Column\<Binary | Boolean | Byte | Double | Float | Integer | Long | Short | String | Timestamp>>*
