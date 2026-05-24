---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/cbacStringToGroupNamesV3/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/cbacStringToGroupNamesV3/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3cbe387edb2bf01e8d87c386565404d176000ed61b281710421b26a9c69725a9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Parse classification string"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Parse classification string

> Supported in: Batch, Streaming

Returns the markings parsed from a given classification string. This output is formatted as a struct, where the first element of the struct is an array comprising the classification markings that represent the input. This list is null if the classification string is invalid, or if there are other errors that occur while parsing the markings. The second element of the struct is the string of error message(s). If there are no errors, the error field will be null. This expression is called asynchronously for performance.

**Expression categories:** Other

## Declared arguments

* **Expression:** A classification string.<br>*Expression\<String>*

**Output type:** *Struct\<markingIds:Array\<Classification>, errors:String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `cbacString`

| cbacString | **Output** |
| ----- | ----- |
| MS//MNF | \[ MS, MNF ] |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `cbacString`

| cbacString | **Output** |
| ----- | ----- |
| *empty string* | \[  ] |

***
