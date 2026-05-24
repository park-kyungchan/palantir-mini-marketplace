---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/chunkStringV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/chunkStringV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "78df2da0f1ab6db7a9b9aaf477bf968a61ab556f96b23e9426e549f9d4226fbf"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Chunk string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Chunk string

> Supported in: Batch, Streaming

Chunk string into chunks of a specified size and on specified separators.

**Expression categories:** String

## Declared arguments

* **Expression:** The column containing the document text to chunk.<br>*Expression\<String>*
* *optional* **Chunk overlap:** Allow chunks to overlap in content by around this number. Must be greater than or equal to 0 and less than the selected chunk size.<br>*Literal\<Integer>*
* *optional* **Chunk size:** Create chunks of size around this number. Must be greater than 0.<br>*Literal\<Integer>*
* *optional* **Keep separator:** Include the separator in the output chunks.<br>*Literal\<Boolean>*
* *optional* **Separators:** Chunk string on these provided separators. The default separators has the effect of trying to keep all paragraphs, and then sentences, and then words together for as long as possible.<br>*List\<Literal\<String>>*

**Output type:** *Array\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `string`
* **Chunk overlap:** *null*
* **Chunk size:** 10
* **Keep separator:** *null*
* **Separators:** *null*

| string | **Output** |
| ----- | ----- |
| hello | \[ hello ] |
| hello world. the quick brown fox jumps over the fence. | \[ hello, world., the quick, brown fox, jumps, over the, fence. ] |
| hello world.<br>the quick brown fox<br>jumps over the fence. | \[ hello, world., the quick, brown fox, jumps, over the, fence. ] |
| hello world.<br>the quick brown fox<br>jumps over the fence. | \[ hello, world., the quick, brown fox, jumps, over the, fence. ] |

***

### Example 2: Base case

**Argument values:**

* **Expression:** A quick-brown-fox-jumps over the lazy dog
* **Chunk overlap:** *null*
* **Chunk size:** 10
* **Keep separator:** false
* **Separators:** \[<br><br>, <br>,  ]

**Output:** \[ A, quick-brown-fox-jumps, over the, lazy dog ]

***

### Example 3: Base case

**Argument values:**

* **Expression:** A quick brown fox jumps over the lazy dog
* **Chunk overlap:** 5
* **Chunk size:** 10
* **Keep separator:** *null*
* **Separators:** *null*

**Output:** \[ A quick, brown fox, fox jumps, over the, the lazy, lazy dog ]

***

### Example 4: Base case

**Argument values:**

* **Expression:** Text1|Text2||Text3
* **Chunk overlap:** *null*
* **Chunk size:** 10
* **Keep separator:** false
* **Separators:** \[||, |]

**Output:** \[ Text1, Text2, Text3 ]

***

### Example 5: Base case

**Argument values:**

* **Expression:** Text1|Text2||Text3
* **Chunk overlap:** *null*
* **Chunk size:** 10
* **Keep separator:** *null*
* **Separators:** \[||, |]

**Output:** \[ Text1, |Text2, ||Text3 ]

***

### Example 6: Base case

**Argument values:**

* **Expression:** Text1, Text2<br><br>Text3<br>Text4
* **Chunk overlap:** *null*
* **Chunk size:** 256
* **Keep separator:** *null*
* **Separators:** *null*

**Output:** \[ Text1, Text2<br><br>Text3<br>Text4 ]

***

### Example 7: Base case

**Argument values:**

* **Expression:** Text1 Text2<br><br>Text3<br>Text4
* **Chunk overlap:** *null*
* **Chunk size:** 10
* **Keep separator:** *null*
* **Separators:** *null*

**Output:** \[ Text1, Text2, Text3, Text4 ]

***
