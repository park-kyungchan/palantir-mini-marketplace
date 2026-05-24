---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/cipherEncryptV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/cipherEncryptV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8aa3f22fa301cf2757ccdab9d40fd071a3429d5f1e59af8331e4baf93ebf914c"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Cipher encrypt"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Cipher encrypt

> Supported in: Batch, Faster, Streaming

Encrypts expression with cipher.

**Expression categories:** Other

## Declared arguments

* **Cipher license rid:** Cipher license to use.<br>*ResourceIdentifier*
* **Expression:** Expression to apply cipher encryption on.<br>*Expression\<String>*

**Output type:** *Cipher Text*

## Examples

### Example 1: Base case

**Argument values:**

* **Cipher license rid:** ri.bellaso.main.cipher-license.1-encrypt
* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| bar | CIPHER::ri.bellaso.main.cipher-channel.1::OCRBIW3iHDltOGa6MEHwb7f/Dw==::CIPHER |

***

### Example 2: Null case

**Argument values:**

* **Cipher license rid:** ri.bellaso.main.cipher-license.1-encrypt
* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| *null* | *null* |

***
