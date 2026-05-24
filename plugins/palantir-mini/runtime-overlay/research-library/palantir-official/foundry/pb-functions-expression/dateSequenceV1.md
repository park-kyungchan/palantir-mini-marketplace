---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/dateSequenceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/dateSequenceV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "51fc1fed02a5b716fffe21c0d6762511ca820fee44f780e9903bc1d5c064b924"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Date sequence"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Date sequence

> Supported in: Batch, Faster

Creates an array with dates in range from start to end.

**Expression categories:** Datetime

## Declared arguments

* **End date:** The date to end at (inclusive).<br>*Expression\<Date>*
* **Start date:** The date to start from (inclusive).<br>*Expression\<Date>*
* **Step unit:** Unit of the step size.<br>*Enum\<Days, Months, Quarters, Weeks, Years>*
* *optional* **Step size:** The size of the steps between numbers. Defaults to 1.<br>*Expression\<Numeric>*

**Output type:** *Array\<Date>*

## Examples

### Example 1: Base case

**Argument values:**

* **End date:** `last_planned_flight`
* **Start date:** `first_planned_flight`
* **Step unit:** `DAYS`
* **Step size:** *null*

| first\_planned\_flight | last\_planned\_flight | **Output** |
| ----- | ----- | ----- |
| 2023-01-01 | 2023-01-03 | \[ 2023-01-01, 2023-01-02, 2023-01-03 ] |
| 2023-01-31 | 2023-02-02 | \[ 2023-01-31, 2023-02-01, 2023-02-02 ] |
| 2023-02-28 | 2023-03-01 | \[ 2023-02-28, 2023-03-01 ] |

***
