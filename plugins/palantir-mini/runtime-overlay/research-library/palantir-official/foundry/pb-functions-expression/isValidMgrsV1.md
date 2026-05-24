---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidMgrsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidMgrsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2aad1272d9bab96012d4b9559867bb5f353e67ccb6a40b627cb32c3de96a94d4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid MGRS"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid MGRS

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid MGRS (military grid reference system) string.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** String following an MGRS (military grid reference system) format.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `mgrs`

| mgrs | **Output** |
| ----- | ----- |
| not an mgrs value | false |
| 4Q FJ | false |
| 1 6 | false |
| 4Q | false |
| 4Q FJ 1 | false |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `mgrs`

| mgrs | **Output** |
| ----- | ----- |
| 4Q FJ 1 6 | true |
| 4Q FJ 12345 67890 | true |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `mgrs`

| mgrs | **Output** |
| ----- | ----- |
| *null* | false |

***
