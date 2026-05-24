---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/convertAngleV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/convertAngleV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "40b4e2c5f102631cc9e3c48047c02addd9c52f0d457dfce8fc99f9a3e33b7efd"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert between angle units"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert between angle units

> Supported in: Batch, Faster, Streaming

**Expression categories:** Geospatial, Numeric

## Declared arguments

* **Amount of current unit:** *no description*<br>*Expression\<DefiniteNumeric>*
* **Current unit:** The unit prior to conversion.<br>*Enum\<Degrees, Minutes, Radians, Seconds>*
* **Target unit:** The desired unit after conversion.<br>*Enum\<Degrees, Minutes, Radians, Seconds>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Amount of current unit:** `degrees`
* **Current unit:** `degrees`
* **Target unit:** `radians`

| degrees | **Output** |
| ----- | ----- |
| 180 | 3.141592653589793 |

***

### Example 2: Base case

**Argument values:**

* **Amount of current unit:** `radians`
* **Current unit:** `radians`
* **Target unit:** `degrees`

| radians | **Output** |
| ----- | ----- |
| 3.141592653589793 | 180.0 |

***

### Example 3: Null case

**Argument values:**

* **Amount of current unit:** `radians`
* **Current unit:** `radians`
* **Target unit:** `degrees`

| radians | **Output** |
| ----- | ----- |
| *null* | *null* |

***
