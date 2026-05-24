---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/dateSubV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/dateSubV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "30395fb909f15cd000a245ba9686b96c05d817d831b83484b5a472b4b8a08674"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Subtract value from date"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Subtract value from date

> Supported in: Batch, Faster, Streaming

Returns the date that is 'value' days/weeks/months/quarter/years before 'start'.

**Expression categories:** Datetime

## Declared arguments

* **Date:** Date to subtract value to.<br>*Expression\<Date>*
* **Unit:** Date unit of the 'value' parameter.<br>*Enum\<Days, Months, Quarters, Weeks, Years>*
* **Value:** Number of days / weeks / quarters / years to subtract.<br>*Expression\<Integer>*

**Output type:** *Date*

## Examples

### Example 1: Base case

**Argument values:**

* **Date:** 2022-04-05
* **Unit:** `DAYS`
* **Value:** 2

**Output:** 2022-04-03

***

### Example 2: Base case

**Argument values:**

* **Date:** 2022-04-05
* **Unit:** `MONTHS`
* **Value:** 2

**Output:** 2022-02-05

***

### Example 3: Base case

**Argument values:**

* **Date:** 2022-04-05
* **Unit:** `QUARTERS`
* **Value:** 2

**Output:** 2021-10-05

***

### Example 4: Base case

**Argument values:**

* **Date:** 2022-04-05
* **Unit:** `YEARS`
* **Value:** 2

**Output:** 2020-04-05

***

### Example 5: Null case

**Argument values:**

* **Date:** `date`
* **Unit:** `YEARS`
* **Value:** `value`

| date | value | **Output** |
| ----- | ----- | ----- |
| 2022-04-05 | *null* | *null* |
| *null* | 2 | *null* |
| *null* | *null* | *null* |

***
