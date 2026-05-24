---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arcsinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arcsinV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "297dbc622e6d48ed30e80adc10655f4ec2aaba5cc1ae786b7d6822e17a87f9c5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Arcsin"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arcsin

> Supported in: Batch, Faster, Streaming

Inverse sine function.

**Expression categories:** Numeric

## Declared arguments

* **Angle unit:** Output angle unit which is either degrees or radians.<br>*Enum\<Degrees, Radians>*
* **Value:** The value to compute arcsin on.<br>*Expression\<Double | Float>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Angle unit:** `radians`
* **Value:** 0.0

**Output:** 0.0

***

### Example 2: Null case

**Argument values:**

* **Angle unit:** `radians`
* **Value:** *null*

**Output:** *null*

***
