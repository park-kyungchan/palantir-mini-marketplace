---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/sampleCovarianceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/sampleCovarianceV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "72d5a21dc666bc8e9b1beb9688d5e25ee68594de6708e5cd59b59b149ca2d020"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Sample covariance"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sample covariance

> Supported in: Batch, Streaming

Calculate the sample covariance of values in two columns.

**Expression categories:** Aggregate

## Declared arguments

* **Left:** The first column on which we compute covariance.<br>*Expression\<Numeric>*
* **Right:** The second column on which we compute covariance.<br>*Expression\<Numeric>*

**Output type:** *Double*

## Examples

### Example 1: Base case

**Argument values:**

* **Left:** `left`
* **Right:** `right`

**Given input table:**

| left | right |
| ----- | ----- |
| 1 | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 | 1 |

**Outputs:** -2.5

***

### Example 2: Null case

**Argument values:**

* **Left:** `left`
* **Right:** `right`

**Given input table:**

| left | right |
| ----- | ----- |
| 1.0 | 2.0 |
| *null* | *null* |
| 2.0 | 1.0 |

**Outputs:** -0.5

***
