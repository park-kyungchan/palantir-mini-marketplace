---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/convertWeightV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/convertWeightV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1639a22bb17656f009fc2f33720ebbd7563ea3d8a202f8a4b76e854abbe45314"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert between weight units"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert between weight units

> Supported in: Batch, Faster, Streaming

**Expression categories:** Numeric

## Declared arguments

* **Amount of current unit:** *no description*<br>*Expression\<DefiniteNumeric>*
* **Current unit:** The unit prior to conversion.<br>*Enum\<Centigram, Decagram, Decigram, Grain, Gram, Hectogram, Kilogram, Long hundredweight, Megagram, Metric ton, and more ...>*
* **Target unit:** The desired unit after conversion.<br>*Enum\<Centigram, Decagram, Decigram, Grain, Gram, Hectogram, Kilogram, Long hundredweight, Megagram, Metric ton, and more ...>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Amount of current unit:** `kilograms`
* **Current unit:** `kilogram`
* **Target unit:** `gram`

| kilograms | **Output** |
| ----- | ----- |
| 5 | 5000.0 |

***

### Example 2: Base case

**Argument values:**

* **Amount of current unit:** `kilograms`
* **Current unit:** `kilogram`
* **Target unit:** `gram`

| kilograms | **Output** |
| ----- | ----- |
| *null* | *null* |

***
