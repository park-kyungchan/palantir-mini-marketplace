---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/convertTimeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/convertTimeV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a12788ac15903da72550ad43fa52ae0c3f8ae892fc1ecf7b1fcbad5178209a33"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert between time units"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert between time units

> Supported in: Batch, Faster, Streaming

**Expression categories:** Datetime

## Declared arguments

* **Amount of current unit:** *no description*<br>*Expression\<DefiniteNumeric>*
* **Current unit:** The unit prior to conversion.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Target unit:** The desired unit after conversion.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Amount of current unit:** `days`
* **Current unit:** `days`
* **Target unit:** `minutes`

| days | **Output** |
| ----- | ----- |
| 12 | 17280.0 |

***

### Example 2: Null case

**Argument values:**

* **Amount of current unit:** `days`
* **Current unit:** `days`
* **Target unit:** `minutes`

| days | **Output** |
| ----- | ----- |
| *null* | *null* |

***
