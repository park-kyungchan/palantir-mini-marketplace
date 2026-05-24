---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/sineV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/sineV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b99adb40091d26e5e4017711b6e274960b7446440d31ba1a1eafa62463fffbf0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Sine"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sine

> Supported in: Batch, Faster, Streaming

Takes the sine of an angle.

**Expression categories:** Numeric

## Declared arguments

* **Angle unit:** Angle unit which is either degrees or radians.<br>*Enum\<Degrees, Radians>*
* **Angle value:** Angle value in either radians or degrees.<br>*Expression\<DefiniteNumeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Angle unit:** `degrees`
* **Angle value:** `angle`

| angle | **Output** |
| ----- | ----- |
| 0.0 | 0.0 |
| 90.0 | 1.0 |
| 180.0 | 0.0 |

***

### Example 2: Null case

**Argument values:**

* **Angle unit:** `radians`
* **Angle value:** *null*

**Output:** *null*

***
