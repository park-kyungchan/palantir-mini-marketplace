---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/greaterThanOrEqualsV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/greaterThanOrEqualsV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c7e78adfe9ca5055d8d82f96cd610fc92cb1f58306346fc0cb7e64e9b7963f38"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Greater than or equals"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Greater than or equals

> Supported in: Batch, Faster, Streaming

Returns true if left is greater than or equal to right.

**Expression categories:** Boolean

## Declared arguments

* **Left:** Left expression.<br>*Expression\<ComparableType>*
* **Right:** Right expression.<br>*Expression\<ComparableType>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Left:** `a`
* **Right:** `b`

| a | b | **Output** |
| ----- | ----- | ----- |
| 1 | 0 | true |
| 1 | 1 | true |
| 0 | 1 | false |

***

### Example 2: Base case

**Argument values:**

* **Left:** `a`
* **Right:** `b`

| a | b | **Output** |
| ----- | ----- | ----- |
| 1 | 0.5 | true |
| 1 | 1.0 | true |

***

### Example 3: Base case

**Argument values:**

* **Left:** `a`
* **Right:** `b`

| a | b | **Output** |
| ----- | ----- | ----- |
| b | a | true |
| abcd | abc | true |
| aa | b | false |

***

### Example 4: Base case

**Argument values:**

* **Left:** `a`
* **Right:** `b`

| a | b | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | *null* |
| 1 | *null* | *null* |
| *null* | 1.0 | *null* |

***
