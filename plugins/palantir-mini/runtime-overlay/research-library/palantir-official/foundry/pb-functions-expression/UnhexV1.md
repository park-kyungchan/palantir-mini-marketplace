---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/UnhexV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/UnhexV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "38129f4a0e9db24e91b4de78e7427ebb0e8ce3e50a1a65eef5ef87bf11974e01"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert from hexadecimal"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert from hexadecimal

> Supported in: Batch, Faster

Inverse of hex. Interprets each pair of characters as a hexadecimal number and converts to the byte representation of the number.

**Expression categories:** Numeric, String

## Declared arguments

* **Expression:** String column to unhex.<br>*Expression\<String>*

**Output type:** *Binary*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string_hex`

| string\_hex | **Output** |
| ----- | ----- |
| 68656C6C6F | aGVsbG8= |
| 3039 | MDk= |
| FFFFFFFFFFFFCFC7 | ////////z8c= |
| 4C6F6E646F6E | TG9uZG9u |

***

### Example 2: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
