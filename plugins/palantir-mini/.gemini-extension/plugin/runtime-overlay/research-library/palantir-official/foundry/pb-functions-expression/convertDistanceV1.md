---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/convertDistanceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/convertDistanceV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "abe9c5019904cdd4bd7ea7268d9a4d40826d57f45d6835ba45901c3e162bf227"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert between distance units"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert between distance units

> Supported in: Batch, Faster, Streaming

**Expression categories:** Numeric

## Declared arguments

* **Amount of current unit:** *no description*<br>*Expression\<DefiniteNumeric>*
* **Current unit:** The unit prior to conversion.<br>*Enum\<Centimeter, Data mile, Decameter, Decimeter, Foot, Hectometer, Inch, Kilometer, Meter, Mile, and more ...>*
* **Target unit:** The desired unit after conversion.<br>*Enum\<Centimeter, Data mile, Decameter, Decimeter, Foot, Hectometer, Inch, Kilometer, Meter, Mile, and more ...>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Amount of current unit:** `kilometers`
* **Current unit:** `kilometer`
* **Target unit:** `meter`

| kilometers | **Output** |
| ----- | ----- |
| 1 | 1000.0 |

***

### Example 2: Null case

**Argument values:**

* **Amount of current unit:** `kilometers`
* **Current unit:** `kilometer`
* **Target unit:** `meter`

| kilometers | **Output** |
| ----- | ----- |
| *null* | *null* |

***
