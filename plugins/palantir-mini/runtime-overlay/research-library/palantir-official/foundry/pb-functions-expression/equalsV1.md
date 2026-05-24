---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/equalsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/equalsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e816fb175089a0b48f552a44b8c5f08e899a772602987a359b28f0bf0487d0c7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Equals"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Equals

> Supported in: Batch, Faster, Streaming

Returns true if left and right are equal.

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
| 1 | 1 | true |
| 1 | 0 | false |

***

### Example 2: Base case

**Argument values:**

* **Left:** `a`
* **Right:** `b`

| a | b | **Output** |
| ----- | ----- | ----- |
| 1.0 | 1 | true |
| 1.0 | 0 | false |

***

### Example 3: Base case

**Argument values:**

* **Left:** `departure`
* **Right:** `destination`

| departure | destination | **Output** |
| ----- | ----- | ----- |
| Heathrow | Heathrow | true |
| Heathrow | Gatwick | false |

***

### Example 4: Null case

**Argument values:**

* **Left:** `departure`
* **Right:** `destination`

| departure | destination | **Output** |
| ----- | ----- | ----- |
| *null* | *null* | true |
| *null* | Heathrow | false |

***
