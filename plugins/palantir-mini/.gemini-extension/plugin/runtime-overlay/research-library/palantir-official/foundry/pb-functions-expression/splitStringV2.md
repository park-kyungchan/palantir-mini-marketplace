---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/splitStringV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/splitStringV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "285744ae35ec28e9b7d4e671b3948522440ed4cfea78d710b543299a7f56364b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Split string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Split string

> Supported in: Batch, Faster, Streaming

Split string on specified regex pattern.

**Expression categories:** String

## Declared arguments

* **Expression:** Input string to split on the specified pattern.<br>*Expression\<String>*
* **Pattern:** The regex pattern to split on.<br>*Regex*
* *optional* **Limit:** Split the string into at most this number of elements. Must be greater than 0.<br>*Literal\<Integer>*

**Output type:** *Array\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string`
* **Pattern:**
* **Limit:** 2

| string | **Output** |
| ----- | ----- |
| hello | \[ hello ] |
| hello world | \[ hello, world ] |
| hello there world | \[ hello, there world ] |

***

### Example 2: Base case

**Argument values:**

* **Expression:** oneAtwoBthreeC
* **Pattern:** \[ABC]
* **Limit:** 10

**Output:** \[ one, two, three, *empty string* ]

***

### Example 3: Base case

**Argument values:**

* **Expression:** oneAtwoBthreeC
* **Pattern:** \[ABC]
* **Limit:** 2

**Output:** \[ one, twoBthreeC ]

***

### Example 4: Null case

**Argument values:**

* **Expression:** *null*
* **Pattern:** pattern
* **Limit:** *null*

**Output:** *null*

***

### Example 5: Edge case

**Argument values:**

* **Expression:** *empty string*
* **Pattern:** foo
* **Limit:** *null*

**Output:** \[ *empty string* ]

***

### Example 6: Edge case

**Argument values:**

* **Expression:** abc
* **Pattern:** *empty string*
* **Limit:** *null*

**Output:** \[ a, b, c ]

***

### Example 7: Edge case

**Argument values:**

* **Expression:** *empty string*
* **Pattern:** *empty string*
* **Limit:** *null*

**Output:** \[ *empty string* ]

***
