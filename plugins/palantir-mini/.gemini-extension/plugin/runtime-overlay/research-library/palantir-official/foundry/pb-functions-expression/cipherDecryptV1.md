---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/cipherDecryptV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/cipherDecryptV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7afa9f69e7efd1148ed143a846aef14888950438ca90ba64ac7b011f946e8157"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Cipher decrypt"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Cipher decrypt

> Supported in: Batch, Faster, Streaming

Decrypts expression with cipher.

**Expression categories:** Other

## Declared arguments

* **Cipher license rid:** Cipher license to use.<br>*ResourceIdentifier*
* **Expression:** Expression to apply cipher decryption on.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Cipher license rid:** ri.bellaso.main.cipher-license.1-decrypt
* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| CIPHER::ri.bellaso.main.cipher-channel.1::OCRBIW3iHDltOGa6MEHwb7f/Dw==::CIPHER | bar |

***

### Example 2: Null case

**Argument values:**

* **Cipher license rid:** ri.bellaso.main.cipher-license.1-decrypt
* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| *null* | *null* |

***
