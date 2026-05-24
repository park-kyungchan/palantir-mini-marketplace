---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/compactH3SetV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/compactH3SetV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "964f9ecc33e3df69937925844fd0e90da745156068ce95bae445f4152c3cbeee"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Compact a set of H3 indices"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Compact a set of H3 indices

> Supported in: Batch, Faster, Streaming

Compact H3 indices into a subset of mixed resolutions if possible. Running the inverse operation uncompact is guaranteed to yield the same set of indices that were compacted if the input indices were all the same resolution. If any of the input indices are invalid this transform will return null. Output indices are sorted in ascending order.

**Expression categories:** Geospatial

## Declared arguments

* **H3 indices:** Set of H3 cells.<br>*Expression\<Array\<H3 Index>>*

**Output type:** *Array\<H3 Index>*

## Examples

### Example 1: Base case

**Argument values:**

* **H3 indices:** `h3_set`

| h3\_set | **Output** |
| ----- | ----- |
| \[ 87754a914ffffff, 87754a916ffffff, 87754a930ffffff, 87754a932ffffff, 87754a933ffffff, 87754a934ffff... | \[ 86754e64fffffff, 87754a914ffffff, 87754a916ffffff, 87754a930ffffff, 87754a932ffffff, 87754a933ffff... |

***

### Example 2: Null case

**Argument values:**

* **H3 indices:** `h3_set`

| h3\_set | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 3: Edge case

**Argument values:**

* **H3 indices:** `h3_set`

| h3\_set | **Output** |
| ----- | ----- |
| \[ 86754e64fffffff, 86754e64fffffff ] | \[ 86754e64fffffff ] |

***

### Example 4: Edge case

**Argument values:**

* **H3 indices:** `h3_set`

| h3\_set | **Output** |
| ----- | ----- |
| \[ Invalid h3 index ] | *null* |

***
