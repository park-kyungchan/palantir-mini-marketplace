---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/datePartV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/datePartV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bdc2f87e6268c23c279bcfac79ead92030c1a9860c6a31aed7c23ef5e7b9ebaa"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract date part"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract date part

> Supported in: Batch, Faster, Streaming

Extracts a part of a date like year or day of week.

**Expression categories:** Datetime

## Declared arguments

* **Expression:** Date to extract from.<br>*Expression\<Date | Timestamp>*
* **Part:** Part of date to extract.<br>*Enum\<Day of month, Day of week, Day of year, Month, Quarter, Week of year, Year>*

**Output type:** *Integer*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `DAY_OF_MONTH`

**Output:** 10

***

### Example 2: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `DAY_OF_WEEK`

**Output:** 4

***

### Example 3: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `DAY_OF_YEAR`

**Output:** 41

***

### Example 4: Base case

**Argument values:**

* **Expression:** 2022-02-10
* **Part:** `MONTH`

**Output:** 2

***

### Example 5: Base case

**Argument values:**

* **Expression:** 2022-02-10
* **Part:** `QUARTER`

**Output:** 1

***

### Example 6: Base case

**Description:** Weeks of year start on Monday and end on Sunday

**Argument values:**

* **Expression:** 2024-01-14T10:00:00Z
* **Part:** `WEEK_OF_YEAR`

**Output:** 2

***

### Example 7: Base case

**Description:** Weeks of year respect leap weeks as defined by ISO 8601

**Argument values:**

* **Expression:** 2027-01-01T10:00:00Z
* **Part:** `WEEK_OF_YEAR`

**Output:** 53

***

### Example 8: Base case

**Argument values:**

* **Expression:** 2022-02-10
* **Part:** `YEAR`

**Output:** 2022

***

### Example 9: Null case

**Argument values:**

* **Expression:** `date`
* **Part:** `YEAR`

| date | **Output** |
| ----- | ----- |
| *null* | *null* |

***
