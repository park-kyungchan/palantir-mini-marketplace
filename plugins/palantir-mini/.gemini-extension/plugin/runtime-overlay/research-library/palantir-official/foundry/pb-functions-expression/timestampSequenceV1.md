---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampSequenceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampSequenceV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "faa3fe6b66f963fb271784dd89874fdc4f862aeb25f43e44df284a4aec3515b1"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Timestamp sequence"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Timestamp sequence

> Supported in: Batch, Faster

Creates an array with timestamps in range from start to end.

**Expression categories:** Datetime

## Declared arguments

* **End time:** The timestamp to end at (inclusive).<br>*Expression\<Date | Timestamp>*
* **Start time:** The timestamp to start from (inclusive).<br>*Expression\<Date | Timestamp>*
* **Step unit:** Unit of the step size.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* *optional* **Step size:** The size of the steps between numbers. Defaults to 1.<br>*Expression\<Numeric>*

**Output type:** *Array\<Timestamp>*

## Examples

### Example 1: Base case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** 1.0

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| 2023-01-01T00:00:00Z | 2023-01-03T00:00:00Z | \[ 2023-01-01T00:00:00Z, 2023-01-02T00:00:00Z, 2023-01-03T00:00:00Z ] |
| 2023-01-01T01:50:00Z | 2023-01-03T00:00:00Z | \[ 2023-01-01T01:50:00Z, 2023-01-02T01:50:00Z ] |

***

### Example 2: Base case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** 1

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| 2023-01-01 | 2023-01-03 | \[ 2023-01-01T00:00:00Z, 2023-01-02T00:00:00Z, 2023-01-03T00:00:00Z ] |

***

### Example 3: Base case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** 1.0

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| 2023-01-03T00:00:00Z | 2023-01-01T00:00:00Z | \[ 2023-01-03T00:00:00Z, 2023-01-02T00:00:00Z, 2023-01-01T00:00:00Z ] |
| 2023-01-03T00:00:00Z | 2023-01-01T01:50:00Z | \[ 2023-01-03T00:00:00Z, 2023-01-02T00:00:00Z ] |

***

### Example 4: Null case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** 1.0

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| *null* | 2023-01-01T00:00:00Z | *null* |
| *null* | *null* | *null* |

***

### Example 5: Null case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** *null*

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| 2023-01-03T00:00:00Z | 2023-01-01T00:00:00Z | *null* |
| 2023-01-01T01:50:00Z | 2023-01-03T00:00:00Z | *null* |

***

### Example 6: Null case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** `step`

| start\_time | end\_time | step | **Output** |
| ----- | ----- | ----- | ----- |
| 2023-01-03T00:00:00Z | 2023-01-01T00:00:00Z | 0.0 | *null* |

***

### Example 7: Edge case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** *null*

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| 2023-01-03T00:00:00Z | 2023-01-01T00:00:00Z | \[ 2023-01-03T00:00:00Z, 2023-01-02T00:00:00Z, 2023-01-01T00:00:00Z ] |
| 2023-01-01T01:50:00Z | 2023-01-03T00:00:00Z | \[ 2023-01-01T01:50:00Z, 2023-01-02T01:50:00Z ] |

***

### Example 8: Edge case

**Argument values:**

* **End time:** `end_time`
* **Start time:** `start_time`
* **Step unit:** `DAYS`
* **Step size:** *null*

| start\_time | end\_time | **Output** |
| ----- | ----- | ----- |
| 2023-01-03T00:00:00Z | 2023-01-03T00:00:00Z | \[ 2023-01-03T00:00:00Z ] |

***
