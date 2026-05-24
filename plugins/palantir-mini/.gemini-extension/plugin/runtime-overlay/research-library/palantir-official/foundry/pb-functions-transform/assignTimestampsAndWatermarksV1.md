---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/assignTimestampsAndWatermarksV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/assignTimestampsAndWatermarksV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "062c7413f6b2875a6d97262ccdae0e998badb5aa38ef8d53df72285bf24a6dfc"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Assign timestamps and watermarks"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Assign timestamps and watermarks

> Supported in: Streaming

Assigns timestamps and watermarks to the input, filtering out records where the timestamp is null.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to assign timestamps and watermarks.<br>*Table*
* **Timestamp expression:** Expression evaluating to timestamp to assign.<br>*Expression\<Timestamp>*
* *optional* **Emit watermark on every record:** If true, the watermark will be propagated for every record in the stream. This is generally inefficient and will add performance overhead but gives deterministic behaviour if the stream is replayed. It is recommended to set this value to false in most cases.<br>*Literal\<Boolean>*
* *optional* **Idleness timeout unit:** Unit for the duration of time to consider a subtask idle.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* *optional* **Idleness timeout value:** Value for the duration of time after which a subtask not receiving records will be considered idle, at which point it will not prevent the global watermark from progressing. This can help address unbounded state growth for time-based transforms or hanging (non-emitting) windows, but late records from slow subtasks may be dropped unexpectedly for downstream operators with allowed lateness. Please check Foundry Streaming docs to understand event-time handling.<br>*Literal\<Long>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Timestamp expression:** `timestamp`
* **Emit watermark on every record:** *null*
* **Idleness timeout unit:** *null*
* **Idleness timeout value:** *null*

**Input:**

| timestamp | temperature | sensor\_id |
| ----- | ----- | ----- |
| 1969-12-31T23:59:50Z | 28 | sensor\_1 |
| 1969-12-31T23:59:40Z | 30 | sensor\_2 |
| 1969-12-31T23:59:35Z | 29 | sensor\_1 |

**Output:**

| timestamp | temperature | sensor\_id |
| ----- | ----- | ----- |
| 1969-12-31T23:59:50Z | 28 | sensor\_1 |
| 1969-12-31T23:59:40Z | 30 | sensor\_2 |
| 1969-12-31T23:59:35Z | 29 | sensor\_1 |

***

### Example 2: Null case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Timestamp expression:** `timestamp`
* **Emit watermark on every record:** *null*
* **Idleness timeout unit:** *null*
* **Idleness timeout value:** *null*

**Input:**

| timestamp | temperature | sensor\_id |
| ----- | ----- | ----- |
| 1969-12-31T23:59:50Z | 28 | sensor\_1 |
| *null* | 30 | sensor\_2 |
| *null* | 29 | sensor\_1 |

**Output:**

| timestamp | temperature | sensor\_id |
| ----- | ----- | ----- |
| 1969-12-31T23:59:50Z | 28 | sensor\_1 |

***
