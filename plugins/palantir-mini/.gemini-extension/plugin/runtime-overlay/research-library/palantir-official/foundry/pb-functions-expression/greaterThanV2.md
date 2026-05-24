---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/greaterThanV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/greaterThanV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "740e112ccb0822282701eb2f0e2f2d2e31c0376917524ffcf44bef913ed0d2ce"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Greater than"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Greater than

> Supported in: Batch, Faster, Streaming

Returns true if left is greater than right.

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
| 1 | 1 | false |
| 0 | 1 | false |

***

### Example 2: Base case

**Argument values:**

* **Left:** `a`
* **Right:** `b`

| a | b | **Output** |
| ----- | ----- | ----- |
| 1 | 0.5 | true |
| 1 | 1.0 | false |

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

### Example 4: Null case

**Argument values:**

* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| *null* | b | *null* |
| b | *null* | *null* |
| *null* | *null* | *null* |

***
