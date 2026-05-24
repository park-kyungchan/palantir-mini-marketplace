---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/HexV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/HexV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6d37d6c8a070c79c67e80d9e9c368e2ba1ad1572c811278e42b8f591f73b76dc"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert to hexadecimal"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert to hexadecimal

> Supported in: Batch, Faster, Streaming

Computes hex value of given expression.

**Expression categories:** Numeric, String

## Declared arguments

* **Expression:** Column to hex.<br>*Expression\<Binary | Byte | Integer | Long | Short | String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `city_hex`

| city\_hex | **Output** |
| ----- | ----- |
| TG9uZG9u | 4C6F6E646F6E |

***

### Example 2: Base case

**Argument values:**

* **Expression:** -12345

**Output:** FFFFFFFFFFFFCFC7

***

### Example 3: Base case

**Argument values:**

* **Expression:** 12345

**Output:** 3039

***

### Example 4: Base case

**Argument values:**

* **Expression:** hello

**Output:** 68656C6C6F

***

### Example 5: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
