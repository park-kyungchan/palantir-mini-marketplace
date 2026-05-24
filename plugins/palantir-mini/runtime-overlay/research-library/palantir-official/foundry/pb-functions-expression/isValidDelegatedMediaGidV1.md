---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidDelegatedMediaGidV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidDelegatedMediaGidV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bd7342656b5a641474cdd87716feefc42c43073e895f12287a7fedd4fbdebbf0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid delegated media gid"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid delegated media gid

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid gotham delegated media gid. Check gotham's delegated media rtfm for more details.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** String to check is a valid gotham delegated media.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** hello

**Output:** false

***

### Example 2: Base case

**Argument values:**

* **Expression:** ri.gotham-delegated-media.12345678-1234-1234-1234-123456789012.testaudiotype.testlocator

**Output:** true

***

### Example 3: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
