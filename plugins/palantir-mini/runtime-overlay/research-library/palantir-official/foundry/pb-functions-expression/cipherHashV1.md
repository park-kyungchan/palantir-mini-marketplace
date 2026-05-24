---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/cipherHashV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/cipherHashV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "07a137f75cda6dfdd5c8fd06617ae8474cfa8696448ec2b868a864fe5edff284"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Cipher hash"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Cipher hash

> Supported in: Batch, Faster, Streaming

Hashes expression with cipher.

**Expression categories:** Other

## Declared arguments

* **Cipher license rid:** Cipher license to use.<br>*ResourceIdentifier*
* **Expression:** Expression to apply cipher hashing on.<br>*Expression\<String>*

**Output type:** *Cipher Text*

## Examples

### Example 1: Base case

**Argument values:**

* **Cipher license rid:** ri.bellaso.main.cipher-license.1-hash
* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| bar | CIPHER::ri.bellaso.main.cipher-channel.1::c70a14f5cc57c940e3265045a5554d641bd549ee27a571a05cdbc75c77762eb86b1144c12f1bb7811a0bcec08b2f143989c44022e4664f615d6885ad640332cb::CIPHER |

***

### Example 2: Null case

**Argument values:**

* **Cipher license rid:** ri.bellaso.main.cipher-license.1-hash
* **Expression:** `string`

| string | **Output** |
| ----- | ----- |
| *null* | *null* |

***
