---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampAddV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampAddV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c8fcd8050f7cc3e60dfa89a04cc4df1862720affb6c8c9e8ed30e4c9078c1c93"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Timestamp add"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Timestamp add

> Supported in: Batch, Faster, Streaming

Add value to timestamp in specified unit.

**Expression categories:** Datetime

## Declared arguments

* **Timestamp:** *no description*<br>*Expression\<Timestamp>*
* **Unit:** Time unit.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Months, Quarters, Seconds, Weeks, Years>*
* **Value to add:** *no description*<br>*Expression\<Byte | Integer | Long | Short>*

**Output type:** *Timestamp*

## Examples

### Example 1: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `DAYS`
* **Value to add:** 2

**Output:** 2022-02-03T00:00:00Z

***

### Example 2: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `HOURS`
* **Value to add:** 2

**Output:** 2022-02-01T02:00:00Z

***

### Example 3: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `MILLISECONDS`
* **Value to add:** 2

**Output:** 2022-02-01T00:00:00.002Z

***

### Example 4: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `MINUTES`
* **Value to add:** 2

**Output:** 2022-02-01T00:02:00Z

***

### Example 5: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `MONTHS`
* **Value to add:** 2

**Output:** 2022-04-01T00:00:00Z

***

### Example 6: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `QUARTERS`
* **Value to add:** 2

**Output:** 2022-08-01T00:00:00Z

***

### Example 7: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `SECONDS`
* **Value to add:** 2

**Output:** 2022-02-01T00:00:02Z

***

### Example 8: Base case

**Argument values:**

* **Timestamp:** 2022-02-01T00:00:00Z
* **Unit:** `YEARS`
* **Value to add:** 2

**Output:** 2024-02-01T00:00:00Z

***

### Example 9: Null case

**Argument values:**

* **Timestamp:** `date`
* **Unit:** `YEARS`
* **Value to add:** `value`

| date | value | **Output** |
| ----- | ----- | ----- |
| 2022-02-01T00:00:00Z | *null* | *null* |
| *null* | 2 | *null* |
| *null* | *null* | *null* |

***
