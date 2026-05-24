---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/epochSecondsToTimestampV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/epochSecondsToTimestampV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c397a167a2e9f2417ef02dfd0f964695d65c5b1fd6f0a065810eb672765c8d83"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Epoch seconds to timestamp"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Epoch seconds to timestamp

> Supported in: Batch, Faster, Streaming

Converts from epoch seconds to timestamp in UTC.

**Expression categories:** Cast, Datetime

## Declared arguments

* **Expression:** Converts from epoch seconds to timestamp in UTC.<br>*Expression\<Double | Integer | Long | String>*

**Output type:** *Timestamp*

## Examples

### Example 1: Base case

**Description:** You can convert epoch timestamps to the timestamp type

**Argument values:**

* **Expression:** 1673964111

**Output:** 2023-01-17T14:01:51Z

***

### Example 2: Base case

**Description:** You can convert epoch timestamps as doubles to the timestamp type

**Argument values:**

* **Expression:** 1673964111.005

**Output:** 2023-01-17T14:01:51.005Z

***

### Example 3: Base case

**Description:** Random strings are read as null

**Argument values:**

* **Expression:** foobar

**Output:** *null*

***

### Example 4: Base case

**Description:** You can convert epoch timestamps as strings to the timestamp type

**Argument values:**

* **Expression:** 1673964111

**Output:** 2023-01-17T14:01:51Z

***

### Example 5: Null case

**Description:** Null columns remain null

**Argument values:**

* **Expression:** `input`

| input | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 6: Null case

**Description:** Null string columns remain null

**Argument values:**

* **Expression:** `input`

| input | **Output** |
| ----- | ----- |
| *null* | *null* |

***
