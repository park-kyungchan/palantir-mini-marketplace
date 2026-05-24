---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/dateAddV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/dateAddV2/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a77a7c78f90fffc3cb84dc8cc0c5cbce1a048d70df758ca41c5294e76a274a91"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Add value to date"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add value to date

> Supported in: Batch, Faster, Streaming

Returns the date that is 'value' days/weeks/months/quarter/years after 'start'.

**Expression categories:** Datetime

## Declared arguments

* **Date:** Date to add value to.<br>*Expression\<Date>*
* **Unit:** Date unit of the 'value' parameter.<br>*Enum\<Days, Months, Quarters, Weeks, Years>*
* **Value:** Number of days / weeks / quarters / years to add.<br>*Expression\<Integer>*

**Output type:** *Date*

## Examples

### Example 1: Base case

**Argument values:**

* **Date:** 2022-02-01
* **Unit:** `DAYS`
* **Value:** 2

**Output:** 2022-02-03

***

### Example 2: Base case

**Argument values:**

* **Date:** 2022-02-01
* **Unit:** `MONTHS`
* **Value:** 2

**Output:** 2022-04-01

***

### Example 3: Base case

**Argument values:**

* **Date:** 2022-02-01
* **Unit:** `QUARTERS`
* **Value:** 2

**Output:** 2022-08-01

***

### Example 4: Base case

**Argument values:**

* **Date:** 2022-02-01
* **Unit:** `YEARS`
* **Value:** 2

**Output:** 2024-02-01

***

### Example 5: Null case

**Argument values:**

* **Date:** `date`
* **Unit:** `YEARS`
* **Value:** `value`

| date | value | **Output** |
| ----- | ----- | ----- |
| 2022-02-01 | *null* | *null* |
| *null* | 2 | *null* |
| *null* | *null* | *null* |

***
