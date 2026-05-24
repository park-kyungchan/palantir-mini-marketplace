---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/kmeansV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/kmeansV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7deee1aef9711e9fe538eca63bf9eb093cfb94cbc4180b955d5c1362e61bf8bf"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > K-means clustering"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# K-means clustering

> Supported in: Batch

K-means clustering is an unsupervised machine learning algorithm. It groups dataset vectors into k clusters. The k value is determined by computing the best silhouette score of the specified range between minimum k and maximum k. Number of k values defines how many k values should be tried within this range, inclusive of the boundaries.

**Transform categories**: Other

## Declared arguments

* **Input dataset:** Source dataset containing vector column.<br>*Table*
* **Maximum k:** Maximum number of clusters.<br>*Literal\<Integer>*
* **Minimum k:** Minimum number of clusters.<br>*Literal\<Integer>*
* **Number of k values:** Number of k values to test, over values from minimum k to maximum k. Note that we will train number of k clustering models, so the pipeline execution might be slow if number of k values is set to a high value. The best model is selected based on the silhouette score.<br>*Literal\<Integer>*
* **Vector column:** Column containing the float vectors that will be used for the clustering.<br>*Column\<Array\<Float>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Maximum k:** 12
* **Minimum k:** 3
* **Number of k values:** 4
* **Vector column:** `feature_column`

**Input:**

| feature\_column |
| ----- |
| \[ 0.05, 3.1, 2.3 ] |
| \[ 1.0, 3.1, 2.3 ] |
| \[ 1.0, 3.5, 2.3 ] |
| \[ 19.0, 12.3, -1.4 ] |

**Output:**

| feature\_column | cluster\_id |
| ----- | ----- |
| \[ 1.0, 3.1, 2.3 ] | 0 |
| \[ 1.0, 3.5, 2.3 ] | 0 |
| \[ 19.0, 12.3, -1.4 ] | 1 |
| \[ 0.05, 3.1, 2.3 ] | 2 |

***

### Example 2: Null case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Maximum k:** 12
* **Minimum k:** 3
* **Number of k values:** 4
* **Vector column:** `feature_column`

**Input:**

| feature\_column |
| ----- |
| \[ 0.05, 3.1, 2.3 ] |
| *null* |
| \[ 1.0, 3.1, 2.3 ] |
| \[ 1.0, 3.5, 2.3 ] |
| \[ 19.0, 12.3, -1.4 ] |

**Output:**

| feature\_column | cluster\_id |
| ----- | ----- |
| \[ 1.0, 3.1, 2.3 ] | 0 |
| \[ 1.0, 3.5, 2.3 ] | 0 |
| \[ 19.0, 12.3, -1.4 ] | 1 |
| \[ 0.05, 3.1, 2.3 ] | 2 |

***

### Example 3: Edge case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Maximum k:** 3
* **Minimum k:** 3
* **Number of k values:** 1
* **Vector column:** `feature_column`

**Input:**

| feature\_column |
| ----- |
| \[ 0.05, 3.1, 2.3 ] |
| \[ 1.0, 3.5, 2.3 ] |
| \[ 19.0, 12.3, -1.4 ] |

**Output:**

| feature\_column | cluster\_id |
| ----- | ----- |
| \[ 19.0, 12.3, -1.4 ] | 0 |
| \[ 0.05, 3.1, 2.3 ] | 1 |
| \[ 1.0, 3.5, 2.3 ] | 2 |

***
