---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/heartbeatDetectionV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/heartbeatDetectionV2/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bd099e5fc783e6d16f520a43c286399644f90270e725a27b5b0c8cc8450288fe"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Heartbeat detection"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Heartbeat detection

> Supported in: Streaming

Detects when a record hasn't been seen for a configurable amount of time for a set of keys.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Input dataset.<br>*Table*
* **Heartbeat time unit:** Unit for amount of time to wait for data for a particular key.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Heartbeat time value:** Value for the amount of time to wait for data from a particular key.<br>*Literal\<Long>*
* **Partition by columns:** Set of columns to use as keys for detecting heartbeats.<br>*Set\<Column\<AnyType>>*

## Examples

### Example 1: Base case

**Description:** The first record from sensor\_1 at time 00:00:00 triggers an alive heartbeat detection. The second record at 00:00:05 extends the timeout but does not emit a new detection. The third record from sensor\_2 at 00:00:20 advances the watermark past 00:00:15, causing sensor\_1's timeout timer to fire and marking its heartbeat as missed. The sensor\_2 record also triggers its own alive detection.

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.test
* **Heartbeat time unit:** `SECONDS`
* **Heartbeat time value:** 10
* **Partition by columns:** {`sensor_id`}

**Input:**

| row\_order | sensor\_id | temperature | measurement\_timestamp |
| ----- | ----- | ----- | ----- |
| 3 | sensor\_2 | 19.8 | 2024-09-30T00:00:20 |
| 2 | sensor\_1 | 21.0 | 2024-09-30T00:00:05 |
| 1 | sensor\_1 | 20.5 | 2024-09-30T00:00:00 |

**Output:**

| sensor\_id | alive | detection\_time |
| ----- | ----- | ----- |
| sensor\_1 | true | 2024-09-30T00:00:00Z |
| sensor\_1 | false | 2024-09-30T00:00:15Z |
| sensor\_2 | true | 2024-09-30T00:00:20Z |

***

### Example 2: Base case

**Description:** Each partition key maintains independent state and timers, but all keys share the same global watermark. sensor\_1 sends data at 00:00:00 and sensor\_2 at 00:00:05. The record from sensor\_3 at 00:00:20 advances the watermark past both timeout thresholds, causing sensor\_1's timer at 00:00:10 and sensor\_2's timer at 00:00:15 to fire in sequence, marking both as missed.

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.test
* **Heartbeat time unit:** `SECONDS`
* **Heartbeat time value:** 10
* **Partition by columns:** {`sensor_id`}

**Input:**

| row\_order | sensor\_id | temperature | measurement\_timestamp |
| ----- | ----- | ----- | ----- |
| 3 | sensor\_3 | 22.1 | 2024-09-30T00:00:20 |
| 2 | sensor\_2 | 18.3 | 2024-09-30T00:00:05 |
| 1 | sensor\_1 | 20.5 | 2024-09-30T00:00:00 |

**Output:**

| sensor\_id | alive | detection\_time |
| ----- | ----- | ----- |
| sensor\_1 | true | 2024-09-30T00:00:00Z |
| sensor\_2 | true | 2024-09-30T00:00:05Z |
| sensor\_1 | false | 2024-09-30T00:00:10Z |
| sensor\_2 | false | 2024-09-30T00:00:15Z |
| sensor\_3 | true | 2024-09-30T00:00:20Z |

***
