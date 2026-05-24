---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToEpochMillisV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampToEpochMillisV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1d70c76a2b76f92cd122eaa4e797a05e02f0ecf2cc894d78bece85033ea1e5e3"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Timestamp to epoch millis"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Timestamp to epoch millis

> Supported in: Batch, Faster, Streaming

Converts from timestamp in UTC to epoch milliseconds.

**Expression categories:** Cast, Datetime

## Declared arguments

* **Timestamp:** Timestamp to convert to epoch milliseconds.<br>*Expression\<Timestamp>*

**Output type:** *Long*

## Examples

### Example 1: Base case

**Argument values:**

* **Timestamp:** 2022-10-01T09:00:00Z

**Output:** 1664614800000

***

### Example 2: Null case

**Argument values:**

* **Timestamp:** *null*

**Output:** *null*

***
