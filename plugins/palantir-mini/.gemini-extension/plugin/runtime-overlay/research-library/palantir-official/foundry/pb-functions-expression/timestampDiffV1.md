---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampDiffV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampDiffV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7ed806b321dfcf8e291fd0bce3a54f6d4c92947dfd94c9a82774ec90afcba062"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Timestamp difference"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Timestamp difference

> Supported in: Batch, Faster, Streaming

Returns the difference between two timestamps in the given time unit.

**Expression categories:** Datetime

## Declared arguments

* **End:** The end date or time to subtract from.<br>*Expression\<Date | Timestamp>*
* **Start:** The start date or time to be subtracted.<br>*Expression\<Date | Timestamp>*
* **Unit:** Time unit.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Months, Quarters, Seconds, Weeks, Years>*

**Output type:** *Long*

## Examples

### Example 1: Base case

**Argument values:**

* **End:** 2022-10-01T10:00:00Z
* **Start:** 2022-10-01T09:00:00Z
* **Unit:** `HOURS`

**Output:** 1

***

### Example 2: Null case

**Argument values:**

* **End:** `End`
* **Start:** `Start`
* **Unit:** `HOURS`

| Start | End | **Output** |
| ----- | ----- | ----- |
| *null* | 2020-01-01 | *null* |
| 2020-01-01 | *null* | *null* |
| *null* | *null* | *null* |

***
