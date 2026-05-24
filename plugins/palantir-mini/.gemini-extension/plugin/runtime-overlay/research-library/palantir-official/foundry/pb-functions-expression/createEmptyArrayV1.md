---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/createEmptyArrayV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/createEmptyArrayV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b446f79ab42858fe9fd4ae06b64cd1f1c8b981336239601f17cedb57eb051563"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create an empty array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create an empty array

> Supported in: Batch, Faster, Streaming

Returns an empty array of the given type.

**Expression categories:** Array

## Declared arguments

* **Type:** The element type of the array to create.<br>*Type\<T>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *Array\<T>*

## Examples

### Example 1: Base case

**Argument values:**

* **Type:** Array\<String>

**Output:** \[  ]

***

### Example 2: Base case

**Argument values:**

* **Type:** Map\<String, String>

**Output:** \[  ]

***

### Example 3: Base case

**Argument values:**

* **Type:** String

**Output:** \[  ]

***

### Example 4: Base case

**Argument values:**

* **Type:** Struct\<string:String, array:Array\<String>>

**Output:** \[  ]

***
