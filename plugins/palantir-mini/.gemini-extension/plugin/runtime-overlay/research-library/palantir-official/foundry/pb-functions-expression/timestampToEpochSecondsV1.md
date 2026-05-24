---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToEpochSecondsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampToEpochSecondsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6d81596f16fad0bd4b30969a4c1e0e7dcc75d91f8a43a0eba1ad2d622462f38e"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Timestamp to epoch seconds"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Timestamp to epoch seconds

> Supported in: Batch, Faster, Streaming

Converts from timestamp in UTC to epoch seconds.

**Expression categories:** Cast, Datetime

## Declared arguments

* **Timestamp:** Timestamp to convert to epoch seconds.<br>*Expression\<Timestamp>*

**Output type:** *Long*

## Examples

### Example 1: Base case

**Argument values:**

* **Timestamp:** 2022-10-01T09:01:13.47Z

**Output:** 1664614873

***

### Example 2: Null case

**Argument values:**

* **Timestamp:** *null*

**Output:** *null*

***
