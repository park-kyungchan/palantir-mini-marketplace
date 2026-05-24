---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/timeBoundedDropDuplicatesV3/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/timeBoundedDropDuplicatesV3/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b7fd71f4cf7eee25086afcfb53219d124cb9b677375a5b8dc244b83e870d9dcd"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Time bounded drop duplicates"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time bounded drop duplicates

> Supported in: Streaming

Drops duplicate rows from the input for given column subset, rows seen will expire after configured amount of event time. Row that arrive late by an amount greater than the configured amount of event time will always be dropped. Partitions by keys specified. Each drop duplicates will be computed separately for distinct key column values.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to deduplicate rows.<br>*Table*
* **Key expiration time unit:** Unit for amount of time to wait for data to deduplicate over.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds>*
* **Key expiration time value:** Value for the amount of time to wait for data to deduplicate over.<br>*Literal\<Long>*
* *optional* **Column subset:** If any columns are specified only those will be used when determining uniqueness, otherwise the key subset that the stream is keyed by is implicitly used to determine uniqueness.<br>*Set\<Column\<AnyType>>*
* *optional* **Eviction window slide:** Value for how long the tumbling window of eviction should be, indicating the cadence at which stale state will be evicted. State is considered stale when more than the specified timeout in event-time has elapsed. Duplicates will be dropped between (key\_expiry : key\_expiry + eviction\_slide] since the last duplicate was seen. Changing this value is considered a state break and will require a replay.<br>*Tuple\<Literal\<Long>, Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>>*
* *optional* **Key by columns:** Columns on which to partition the input by key. Each drop duplicates will be computed separately in parallel for each distinct key value.<br>*Set\<Column\<Binary | Boolean | Byte | Double | Float | Integer | Long | Short | String | Timestamp>>*

## Examples

### Example 1: Base case

**Description:** The first record at 00:00:00 is emitted and its state is scheduled for eviction at the next tumbling window boundary determined by the eviction window slide (default 1 minute). Although the configured timeout is 10 seconds, the subsequent records at 00:00:09, 00:00:18, and 00:00:28 are all dropped as duplicates because the watermark does not advance far enough for the eviction timer to fire. Duplicates are dropped between the key expiry and key expiry plus the eviction window slide.

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.test
* **Key expiration time unit:** `SECONDS`
* **Key expiration time value:** 10
* **Column subset:** *null*
* **Eviction window slide:** *null*
* **Key by columns:** *null*

**Input:**

| row\_order | day | temperature | measurement\_timestamp |
| ----- | ----- | ----- | ----- |
| 4 | Monday | 10.4 | 2024-09-30T00:00:28 |
| 3 | Monday | 10.3 | 2024-09-30T00:00:18 |
| 2 | Monday | 10.2 | 2024-09-30T00:00:09 |
| 1 | Monday | 10.1 | 2024-09-30T00:00:00 |

**Output:**

| day | temperature | measurement\_timestamp |
| ----- | ----- | ----- |
| Monday | 10.1 | 2024-09-30T00:00:00 |

***

### Example 2: Base case

**Description:** With deduplication partitioned by the day column, each key maintains independent state. The first record for Monday at 00:00:20 is emitted and advances the watermark. The record for Tuesday at 00:00:05 is dropped because it arrives too late: its event time plus the 10 second timeout (00:00:15) is behind the watermark (approximately 00:00:20). This occurs even though Tuesday has no prior records. The record for Wednesday at 00:00:25 is not late and is emitted as the first record for its key.

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.test
* **Key expiration time unit:** `SECONDS`
* **Key expiration time value:** 10
* **Column subset:** *null*
* **Eviction window slide:** *null*
* **Key by columns:** {`day`}

**Input:**

| row\_order | day | temperature | measurement\_timestamp |
| ----- | ----- | ----- | ----- |
| 3 | Wednesday | 22.1 | 2024-09-30T00:00:25 |
| 2 | Tuesday | 18.3 | 2024-09-30T00:00:05 |
| 1 | Monday | 20.5 | 2024-09-30T00:00:20 |

**Output:**

| day | temperature | measurement\_timestamp |
| ----- | ----- | ----- |
| Monday | 20.5 | 2024-09-30T00:00:20 |
| Wednesday | 22.1 | 2024-09-30T00:00:25 |

***
