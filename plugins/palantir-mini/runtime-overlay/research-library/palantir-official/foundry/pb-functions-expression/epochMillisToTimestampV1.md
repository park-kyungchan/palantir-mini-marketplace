---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/epochMillisToTimestampV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/epochMillisToTimestampV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9313189f3c8843b43a226f41f9c957d96a9a2e310f568cd5d0ea89cb5049a01f"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Epoch milliseconds to timestamp"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Epoch milliseconds to timestamp

> Supported in: Batch, Faster, Streaming

Converts from epoch milliseconds to timestamp in UTC.

**Expression categories:** Cast, Datetime

## Declared arguments

* **Expression:** Expression containing epoch milliseconds to convert.<br>*Expression\<Double | Long>*

**Output type:** *Timestamp*

## Examples

### Example 1: Base case

**Description:** You can convert epoch timestamps in milliseconds to the timestamp type

**Argument values:**

* **Expression:** 1673964111000

**Output:** 2023-01-17T14:01:51Z

***

### Example 2: Null case

**Description:** Null columns remain null

**Argument values:**

* **Expression:** `input`

| input | **Output** |
| ----- | ----- |
| *null* | *null* |

***
