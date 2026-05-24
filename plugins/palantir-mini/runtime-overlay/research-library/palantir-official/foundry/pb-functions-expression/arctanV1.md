---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arctanV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arctanV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c7b566f2b65bb381b1eb4e543eeb3edcb5db27bd5a23896008bbfa3b5f424386"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Arctan"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arctan

> Supported in: Batch, Faster, Streaming

Inverse tangent function.

**Expression categories:** Numeric

## Declared arguments

* **Angle unit:** Output angle unit which is either degrees or radians.<br>*Enum\<Degrees, Radians>*
* **Value:** The value to compute arctan on.<br>*Expression\<Double | Float>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Angle unit:** `degrees`
* **Value:** `angle`

| angle | **Output** |
| ----- | ----- |
| -1.0 | -45.0 |
| 0.0 | 0.0 |
| 1.0 | 45.0 |

***

### Example 2: Null case

**Argument values:**

* **Angle unit:** `radians`
* **Value:** *null*

**Output:** *null*

***
