---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/tangentV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/tangentV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "824ae38ae528afd6b0862c8e5af94e2c78e9619423153e7d550af8fec1000fd5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Tangent"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Tangent

> Supported in: Batch, Faster, Streaming

Takes the tangent of an angle.

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
| 90.0 | 1.633123935319537E16 |
| 180.0 | 0.0 |

***

### Example 2: Null case

**Argument values:**

* **Angle unit:** `radians`
* **Angle value:** *null*

**Output:** *null*

***
