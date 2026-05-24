---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arccosV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arccosV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "28b7700b553cf4e224d0fff4d99b4ddabecf9919da452ff683eced1cb8e2c141"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Arccos"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arccos

> Supported in: Batch, Faster, Streaming

Inverse cosine function.

**Expression categories:** Numeric

## Declared arguments

* **Angle unit:** Output angle unit which is either degrees or radians.<br>*Enum\<Degrees, Radians>*
* **Value:** The value to compute arccos on.<br>*Expression\<Double | Float>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Angle unit:** `radians`
* **Value:** 1.0

**Output:** 0.0

***

### Example 2: Null case

**Argument values:**

* **Angle unit:** `radians`
* **Value:** *null*

**Output:** *null*

***
