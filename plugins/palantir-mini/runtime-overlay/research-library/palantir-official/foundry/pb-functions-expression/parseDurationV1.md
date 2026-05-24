---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/parseDurationV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/parseDurationV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "811f4e020f4a2377d12cb4620fb8e0fac869fa6942f745f65656295c04d6c789"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Parse duration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Parse duration

> Supported in: Batch

Parses an ISO8601 string duration and start time to its length in a specific time unit.

**Expression categories:** Datetime, String

## Declared arguments

* **Duration:** The ISO8601 duration to parse. If invalid, the output will be null.<br>*Expression\<String>*
* **Start time:** Start timestamp of duration, used for determining the length of certain durations (e.g. months).<br>*Expression\<Timestamp>*
* **Unit:** Output time unit. The result will be the number of complete time units represented by the duration.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Months, Quarters, Seconds, Weeks, Years>*

**Output type:** *Long*

## Examples

### Example 1: Base case

**Argument values:**

* **Duration:** PT1M30.5S
* **Start time:** 2022-10-01T09:00:00Z
* **Unit:** `SECONDS`

**Output:** 90

***

### Example 2: Base case

**Argument values:**

* **Duration:** P2DT6H
* **Start time:** 2022-10-01T09:00:00Z
* **Unit:** `HOURS`

**Output:** 54

***

### Example 3: Base case

**Argument values:**

* **Duration:** P1M2W
* **Start time:** 2023-02-01T09:00:00Z
* **Unit:** `DAYS`

**Output:** 42

***

### Example 4: Null case

**Argument values:**

* **Duration:** PT1Y6M
* **Start time:** 2022-02-01T00:00:00Z
* **Unit:** `YEARS`

**Output:** *null*

***

### Example 5: Null case

**Argument values:**

* **Duration:** *null*
* **Start time:** 2022-02-01T00:00:00Z
* **Unit:** `MILLISECONDS`

**Output:** *null*

***

### Example 6: Edge case

**Argument values:**

* **Duration:** P300000000000Y
* **Start time:** 2022-02-01T00:00:00Z
* **Unit:** `MILLISECONDS`

**Output:** *null*

***
