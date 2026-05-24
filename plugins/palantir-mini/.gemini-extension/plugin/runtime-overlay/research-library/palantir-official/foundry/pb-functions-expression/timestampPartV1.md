---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampPartV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampPartV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "22943b05cbf14c4cfe7bfa7c0c2c827cd22880cb04a27792ef128d22704ffce9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract timestamp part"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract timestamp part

> Supported in: Batch, Faster, Streaming

Extracts a part of a timestamp like year or day of week.

**Expression categories:** Datetime

## Declared arguments

* **Expression:** Timestamp to extract from.<br>*Expression\<Timestamp>*
* **Part:** Part of timestamp to extract.<br>*Enum\<Day of month, Day of week, Day of year, Hour of day, Millisecond of second, Minutes of hour, Month, Quarter, Second of minute, Week of year, and more ...>*

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

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `HOUR_OF_DAY`

**Output:** 10

***

### Example 5: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00.002Z
* **Part:** `MILLISECOND_OF_SECOND`

**Output:** 2

***

### Example 6: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `MONTH`

**Output:** 2

***

### Example 7: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `QUARTER`

**Output:** 1

***

### Example 8: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:10Z
* **Part:** `SECOND_OF_MINUTE`

**Output:** 10

***

### Example 9: Base case

**Argument values:**

* **Expression:** 2022-02-10T10:00:00Z
* **Part:** `YEAR`

**Output:** 2022

***

### Example 10: Null case

**Argument values:**

* **Expression:** `date`
* **Part:** `YEAR`

| date | **Output** |
| ----- | ----- |
| *null* | *null* |

***
