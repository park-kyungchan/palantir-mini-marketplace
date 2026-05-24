---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/skipBytesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/skipBytesV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8311097fd9e8553dd0fe520b0fb2d4b8bc4691a9abdccec83d9c6b141ecd980b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Skip bytes"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Skip bytes

> Supported in: Batch, Faster, Streaming

Skip a given number of bytes in a binary column.

**Expression categories:** Binary

## Declared arguments

* **Bytes:** *no description*<br>*Expression\<Binary>*
* **Number of bytes to skip:** *no description*<br>*Expression\<Integer>*

**Output type:** *Binary*

## Examples

### Example 1: Base case

**Argument values:**

* **Bytes:** aGk=
* **Number of bytes to skip:** 1

**Output:** aQ==

***

### Example 2: Null case

**Argument values:**

* **Bytes:** *null*
* **Number of bytes to skip:** 1

**Output:** *null*

***

### Example 3: Null case

**Argument values:**

* **Bytes:** aGk=
* **Number of bytes to skip:** *null*

**Output:** *null*

***

### Example 4: Edge case

**Argument values:**

* **Bytes:** aGk=
* **Number of bytes to skip:** 100

**Output:** *null*

***
