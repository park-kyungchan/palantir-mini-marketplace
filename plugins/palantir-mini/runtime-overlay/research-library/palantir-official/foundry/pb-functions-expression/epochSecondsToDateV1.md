---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/epochSecondsToDateV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/epochSecondsToDateV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e520b127653901e1b930a76d2e2a893a5768b13c4a120df7b12414554e91e47e"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Epoch seconds to date"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Epoch seconds to date

> Supported in: Batch, Faster, Streaming

Converts from epoch seconds to date in UTC.

**Expression categories:** Cast, Datetime

## Declared arguments

* **Expression:** Epoch seconds expressions.<br>*Expression\<Double | Integer | Long>*

**Output type:** *Date*

## Examples

### Example 1: Base case

**Description:** You can convert epoch timestamps to the date type

**Argument values:**

* **Expression:** 1673964111

**Output:** 2023-01-17

***

### Example 2: Null case

**Description:** Null columns remain null

**Argument values:**

* **Expression:** `input`

| input | **Output** |
| ----- | ----- |
| *null* | *null* |

***
