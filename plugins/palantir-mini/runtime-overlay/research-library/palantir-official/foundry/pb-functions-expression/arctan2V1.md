---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arctan2V1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arctan2V1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "83a362fdeef1af288ed0336a554dfc53db78e4988fc320af2161aefe787e34ed"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Arctan2"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arctan2

> Supported in: Batch, Faster, Streaming

Returns the angle θ between the ray from the origin to the point (x, y) and the positive x-axis, confined to −π<θ<=π.

**Expression categories:** Numeric

## Declared arguments

* **Angle unit:** Output angle unit which is either degrees or radians.<br>*Enum\<Degrees, Radians>*
* **X:** X coordinate value.<br>*Expression\<Double | Float>*
* **Y:** Y coordinate value.<br>*Expression\<Double | Float>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Angle unit:** `degrees`
* **X:** `x`
* **Y:** `y`

| y | x | **Output** |
| ----- | ----- | ----- |
| 0.0 | 0.0 | 0.0 |
| 1.0 | 0.0 | 90.0 |
| 0.0 | -1.0 | 180.0 |
| -1.0 | 0.0 | -90.0 |

***

### Example 2: Null case

**Argument values:**

* **Angle unit:** `radians`
* **X:** *null*
* **Y:** 0.0

**Output:** *null*

***
