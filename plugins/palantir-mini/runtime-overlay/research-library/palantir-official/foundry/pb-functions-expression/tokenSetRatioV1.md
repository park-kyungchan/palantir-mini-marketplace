---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/tokenSetRatioV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/tokenSetRatioV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "469aef9688df13a4d99f2d5d99aa4aa5cc984d13560017e55ec7c449e3107050"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Token set ratio"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Token set ratio

> Supported in: Batch, Streaming

Compute the token set ratio between two strings. Token set ratio is a metric describing how similar two strings are, and will return a value between 0 and 1, where 0 means that there are no similarities between the two strings and 1 means that they are the same (or one is a substring of the other).

**Expression categories:** Distance measurement, String

## Declared arguments

* **Ignore case:** Do you want to ignore case when comparing the left and right strings?<br>*Literal\<Boolean>*
* **Left:** Left string to compare.<br>*Expression\<String>*
* **Right:** Right string to compare.<br>*Expression\<String>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Ignore case:** false
* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| hello world | world hello | 1.0 |
| Hello | hello world | 0.5 |
| hello hello WorlD | hello world | 0.8181818181818181 |
| hello | farewell | 0.46153846153846156 |
| *empty string* | *empty string* | 1.0 |

***

### Example 2: Base case

**Description:** By setting ignore case to true, letters of different case are treated as equal.

**Argument values:**

* **Ignore case:** true
* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| Hello | hello world | 1.0 |
| hello hello WorlD | hello world | 1.0 |
| hello | FAREWELL | 0.46153846153846156 |

***

### Example 3: Null case

**Argument values:**

* **Ignore case:** false
* **Left:** `left`
* **Right:** `right`

| left | right | **Output** |
| ----- | ----- | ----- |
| hello | *null* | *null* |
| *null* | hello | *null* |
| *null* | *null* | *null* |

***
