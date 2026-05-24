---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/extractOffsetFromLegacyOffsetDateTimeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/extractOffsetFromLegacyOffsetDateTimeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dd2c6734ca2971c28a336f1afbadc80954b13a6a64e75ef777c1f45332a6e19d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract offset from legacy OffsetDateTime"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract offset from legacy OffsetDateTime

> Supported in: Batch

Extracts the offset from a legacy OffsetDateTime column. This is the offset in seconds of the origin timezone of the timestamp from UTC timezone.

**Expression categories:** Datetime

## Declared arguments

* **Expression:** The legacy OffsetDateTime column.<br>*Expression\<Struct\<timestamp:Timestamp, offset:Integer>>*

**Output type:** *Integer*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `col_a`

| col\_a | **Output** |
| ----- | ----- |
| {<br> **offset**: 0,<br> **timestamp**: 2024-09-09T09:00:00.001Z,<br>} | 0 |
| {<br> **offset**: 19800,<br> **timestamp**: 2024-09-09T09:00:00.001Z,<br>} | 19800 |
| {<br> **offset**: -3600,<br> **timestamp**: 2024-09-09T09:00:00.001Z,<br>} | -3600 |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `col_a`

| col\_a | **Output** |
| ----- | ----- |
| *null* | *null* |
| {<br> **offset**: 19800,<br> **timestamp**: *null*,<br>} | 19800 |
| {<br> **offset**: *null*,<br> **timestamp**: 2024-09-09T09:00:00.001Z,<br>} | 0 |

***
