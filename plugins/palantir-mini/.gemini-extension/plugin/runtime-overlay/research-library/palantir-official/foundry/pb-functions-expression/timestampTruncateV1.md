---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampTruncateV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampTruncateV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "891fff291c85a524c637a8263245c1ff634effe35a4b22745fc79e7132945554"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Truncate timestamp"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Truncate timestamp

> Supported in: Batch, Faster

Returns the timestamp truncated to the specified unit.

**Expression categories:** Datetime

## Declared arguments

* **Start:** *no description*<br>*Expression\<Timestamp>*
* **Unit:** Time unit used to truncate.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Months, Quarters, Seconds, Weeks, Years>*

**Output type:** *Timestamp*

## Examples

### Example 1: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.002Z
* **Unit:** `DAYS`

**Output:** 2022-02-01T00:00:00Z

***

### Example 2: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.002Z
* **Unit:** `HOURS`

**Output:** 2022-02-01T10:00:00Z

***

### Example 3: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.0022Z
* **Unit:** `MILLISECONDS`

**Output:** 2022-02-01T10:10:10.002Z

***

### Example 4: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.002Z
* **Unit:** `MINUTES`

**Output:** 2022-02-01T10:10:00Z

***

### Example 5: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.002Z
* **Unit:** `MONTHS`

**Output:** 2022-02-01T00:00:00Z

***

### Example 6: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.002Z
* **Unit:** `QUARTERS`

**Output:** 2022-01-01T00:00:00Z

***

### Example 7: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.0022Z
* **Unit:** `SECONDS`

**Output:** 2022-02-01T10:10:10Z

***

### Example 8: Base case

**Argument values:**

* **Start:** 2022-02-01T10:10:10.002Z
* **Unit:** `YEARS`

**Output:** 2022-01-01T00:00:00Z

***

### Example 9: Null case

**Argument values:**

* **Start:** *null*
* **Unit:** `YEARS`

**Output:** *null*

***
