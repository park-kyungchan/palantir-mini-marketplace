---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "849d36646fb9fcb0136debbb0a2b0cf6f175a7b7bfa124f2c5a60bafe6fda4e0"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Join array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Join array

> Supported in: Batch, Faster, Streaming

Joins array with specified separator.

**Expression categories:** Array

## Declared arguments

* **Array to join:** Array to join on.<br>*Expression\<Array\<String>>*
* **Separator:** Separator to join array with.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Array to join:** \[ hello, world ]
* **Separator:** -

**Output:** hello-world

***

### Example 2: Base case

**Argument values:**

* **Array to join:** \[ hello, world ]
* **Separator:** <br>

**Output:** hello<br>world

***

### Example 3: Null case

**Argument values:**

* **Array to join:** `array`
* **Separator:** `separator`

| array | separator | **Output** |
| ----- | ----- | ----- |
| \[ hello, world ] | *null* | helloworld |
| *null* | - | *null* |
| *null* | *null* | *null* |

***

### Example 4: Edge case

**Argument values:**

* **Array to join:** \[  ]
* **Separator:** -

**Output:** *empty string*

***
