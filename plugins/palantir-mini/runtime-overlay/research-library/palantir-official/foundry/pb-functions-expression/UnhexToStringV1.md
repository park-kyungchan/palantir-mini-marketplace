---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/UnhexToStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/UnhexToStringV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7759f331be450e16cb71abfb8f18a62a9fb996a090414545254a3f6ea0cf3a83"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert from hexadecimal to string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert from hexadecimal to string

> Supported in: Batch, Faster, Streaming

Inverse of hex, interprets each pair of characters as a hexadecimal number and converts to the utf-8 string of the byte representation of the number.

**Expression categories:** String

## Declared arguments

* **Expression:** String column to unhex.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string_hex`

| string\_hex | **Output** |
| ----- | ----- |
| 68656C6C6F | hello |
| 4C6F6E646F6E | London |

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

| string\_hex | **Output** |
| ----- | ----- |
| *null* | *null* |

***
