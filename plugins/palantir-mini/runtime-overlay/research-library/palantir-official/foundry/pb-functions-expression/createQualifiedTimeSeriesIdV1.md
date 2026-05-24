---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/createQualifiedTimeSeriesIdV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/createQualifiedTimeSeriesIdV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b0aa0c911636686b6b58c9f848f6cf3c646be58cecd44872931ed7be8c682822"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create time series reference values"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create time series reference values

> Supported in: Batch, Streaming

Creates time series reference values.

**Expression categories:** String

## Declared arguments

* **Series identifier:** The series identifiers contained in the time series sync.<br>*Expression\<String>*
* **Time series sync RID:** The resource identifier (RID) of the time series sync containing the series identifiers.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Series identifier:** `seriesId`
* **Time series sync RID:** ri.time-series-catalog.main.sync.11111111

| seriesId | **Output** |
| ----- | ----- |
| seriesOne | {"seriesId":"seriesOne","syncRid":"ri.time-series-catalog.main.sync.11111111"} |

***

### Example 2: Base case

**Argument values:**

* **Series identifier:** `seriesId`
* **Time series sync RID:** `syncRid`

| seriesId | syncRid | **Output** |
| ----- | ----- | ----- |
| seriesOne | ri.time-series-catalog.main.sync.11111111 | {"seriesId":"seriesOne","syncRid":"ri.time-series-catalog.main.sync.11111111"} |
| seriesTwo | ri.time-series-catalog.main.sync.22222222 | {"seriesId":"seriesTwo","syncRid":"ri.time-series-catalog.main.sync.22222222"} |

***

### Example 3: Null case

**Argument values:**

* **Series identifier:** `seriesId`
* **Time series sync RID:** ri.time-series-catalog.main.sync.11111111

| seriesId | **Output** |
| ----- | ----- |
| *null* | {"seriesId":"null","syncRid":"ri.time-series-catalog.main.sync.11111111"} |

***

### Example 4: Null case

**Argument values:**

* **Series identifier:** `seriesId`
* **Time series sync RID:** *null*

| seriesId | **Output** |
| ----- | ----- |
| seriesOne | {"seriesId":"seriesOne","syncRid":"null"} |

***
