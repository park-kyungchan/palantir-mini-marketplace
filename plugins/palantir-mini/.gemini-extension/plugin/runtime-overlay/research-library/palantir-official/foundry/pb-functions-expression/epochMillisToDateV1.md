---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/epochMillisToDateV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/epochMillisToDateV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bf0776588541c9a2b6fc858de4d37aae58f68018992c38e3bd569580ad53e865"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Epoch milliseconds to date"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Epoch milliseconds to date

> Supported in: Batch, Faster, Streaming

Converts from epoch milliseconds to date, UTC.

**Expression categories:** Cast, Datetime

## Declared arguments

* **Expression:** Epoch milliseconds expressions.<br>*Expression\<Double | Long>*

**Output type:** *Date*

## Examples

### Example 1: Base case

**Description:** You can convert epoch timestamps in milliseconds to the date type

**Argument values:**

* **Expression:** 1673964111000

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
