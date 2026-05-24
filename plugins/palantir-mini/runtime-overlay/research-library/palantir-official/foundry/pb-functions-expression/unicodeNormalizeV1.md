---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/unicodeNormalizeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/unicodeNormalizeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a9868c706554bf097888bcb7ba6870c478d100f11c361b02b0e896cba3dc201d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Unicode normalize"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Unicode normalize

> Supported in: Batch, Faster, Streaming

Perform unicode normalization as per Unicode Standard Annex #15.

**Expression categories:** Data preparation, String

## Declared arguments

* **Expression:** *no description*<br>*Expression\<String>*
* **Normalization form:** *no description*<br>*Enum\<NFC, NFD, NFKC, NFKD>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string`
* **Normalization form:** `nfc`

| string | **Output** |
| ----- | ----- |
| １２３ | １２３ |
| イナゴ | イナゴ |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `string`
* **Normalization form:** `nfd`

| string | **Output** |
| ----- | ----- |
| １２３ | １２３ |
| イナゴ | イナゴ |

***

### Example 3: Base case

**Argument values:**

* **Expression:** `string`
* **Normalization form:** `nfkc`

| string | **Output** |
| ----- | ----- |
| １２３ | 123 |
| イナゴ | イナゴ |

***

### Example 4: Base case

**Argument values:**

* **Expression:** `string`
* **Normalization form:** `nfkd`

| string | **Output** |
| ----- | ----- |
| １２３ | 123 |
| イナゴ | イナゴ |

***
