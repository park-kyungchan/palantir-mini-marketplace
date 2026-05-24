---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToUtcV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/timestampToUtcV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f2713b02ed9c10953bcd21b890a7ed540bb680db3442cb0452e3d8aef0cb4f1f"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert timestamp to UTC"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert timestamp to UTC

> Supported in: Batch, Faster, Streaming

Converts a timestamp to UTC based on a given time zone.

**Expression categories:** Datetime

## Declared arguments

* **Time zone:** Time zone that the current timestamp is recorded in.<br>*TimeZone*
* **Timestamp:** Timestamp column.<br>*Expression\<Timestamp>*

**Output type:** *Timestamp*

## Examples

### Example 1: Base case

**Argument values:**

* **Time zone:** Europe/London
* **Timestamp:** 2018-10-28T01:01:01Z

**Output:** 2018-10-28T00:01:01Z

***

### Example 2: Base case

**Argument values:**

* **Time zone:** Australia/Sydney
* **Timestamp:** 2020-04-28T10:09:00Z

**Output:** 2020-04-28T00:09:00Z

***

### Example 3: Base case

**Argument values:**

* **Time zone:** EST
* **Timestamp:** 2020-04-28T10:09:00Z

**Output:** 2020-04-28T15:09:00Z

***

### Example 4: Base case

**Argument values:**

* **Time zone:** Europe/London
* **Timestamp:** 2026-03-29T01:01:01Z

**Output:** 2026-03-29T01:01:01Z

***

### Example 5: Base case

**Argument values:**

* **Time zone:** UTC
* **Timestamp:** 2020-04-28T10:09:00Z

**Output:** 2020-04-28T10:09:00Z

***

### Example 6: Null case

**Argument values:**

* **Time zone:** UTC
* **Timestamp:** *null*

**Output:** *null*

***
