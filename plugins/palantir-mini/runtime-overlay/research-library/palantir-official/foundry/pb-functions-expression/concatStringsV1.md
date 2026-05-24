---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/concatStringsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/concatStringsV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "384451025a36e444f15d461af0a13a0048cb69360ee6460e2be15e16b8152170"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Concatenate strings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Concatenate strings

> Supported in: Batch, Faster, Streaming

Concatenates a list of strings with the specified separator.

**Expression categories:** String

## Declared arguments

* **Expressions:** List of strings to be concatenated.<br>*List\<Expression\<String>>*
* *optional* **Null output if any input is null:** If any of the input values are null, then the output should be null. If false, null values in the input are ignored.<br>*Literal\<Boolean>*
* *optional* **Separator:** Separator to be added between the strings.<br>*Literal\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expressions:** \[hello, world]
* **Null output if any input is null:** *null*
* **Separator:** \_

**Output:** hello\_world

***

### Example 2: Null case

**Argument values:**

* **Expressions:** \[hello, *null*, world, !]
* **Null output if any input is null:** *null*
* **Separator:** --

**Output:** hello--world--!

***

### Example 3: Null case

**Argument values:**

* **Expressions:** \[hello, *null*, world, !]
* **Null output if any input is null:** true
* **Separator:** --

**Output:** *null*

***
