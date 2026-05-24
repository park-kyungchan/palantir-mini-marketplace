---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/lessThanOrEqualsV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/lessThanOrEqualsV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "684fa86af483a7babcb65cfb8e723ac6615e4ad1625c442a2b172dbf56215425"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Less than or equals"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Less than or equals

> Supported in: Batch, Faster, Streaming

Returns true if left is less than or equal to right.

**Expression categories:** Boolean

## Declared arguments

* **Left:** Left expression.<br>*Expression\<ComparableType>*
* **Right:** Right expression.<br>*Expression\<ComparableType>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| 1.0 | 10 | true |
| 10.0 | 1 | false |

***

### Example 2: Base case

**Argument values:**

* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| a | b | true |
| b | a | false |

***

### Example 3: Null case

**Argument values:**

* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| *null* | b | *null* |
| b | *null* | *null* |
| *null* | *null* | *null* |

***
