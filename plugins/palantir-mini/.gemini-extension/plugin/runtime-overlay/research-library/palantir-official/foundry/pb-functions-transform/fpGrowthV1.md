---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/fpGrowthV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/fpGrowthV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7a99a4726d92744887186fc3d4c3fc0141fc2cb7246d505357a2ff99326d7e23"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Frequent pattern growth"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Frequent pattern growth

> Supported in: Batch

Frequent pattern (fp) growth finds frequent patterns in your dataset.

**Transform categories**: Aggregate, Other

## Declared arguments

* **Input dataset:** Source dataset containing items columns and transaction column.<br>*Table*
* **Items column:** Array column containing the items for the patterns.<br>*Column\<Array\<String>>*
* **Minimum support:** Minimum fraction of how often a pattern needs to be present.<br>*Literal\<Double>*

## Examples

### Example 1: Base case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Items column:** `customer_attributes`
* **Minimum support:** 0.6

**Input:**

| customer\_attributes |
| ----- |
| \[ age\_group: 20-30, country: Germany, gender: Female ] |
| \[ age\_group: 20-30, country: Germany, gender: Male ] |

**Output:**

| pattern | pattern\_occurrence | total\_count |
| ----- | ----- | ----- |
| \[ country: Germany, age\_group: 20-30 ] | 2 | 2 |
| \[ age\_group: 20-30 ] | 2 | 2 |
| \[ country: Germany ] | 2 | 2 |

***

### Example 2: Null case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Items column:** `customer_attributes`
* **Minimum support:** 0.0

**Input:**

| customer\_attributes |
| ----- |
| *null* |

**Output:**

| pattern | pattern\_occurrence | total\_count |
| ----- | ----- | ----- |

***

### Example 3: Null case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Items column:** `customer_attributes`
* **Minimum support:** 0.0

**Input:**

| customer\_attributes |
| ----- |
| \[ age\_group: 20-30, country: Germany, gender: Female ] |
| \[ *null* ] |

**Output:**

| pattern | pattern\_occurrence | total\_count |
| ----- | ----- | ----- |
| \[ country: Germany ] | 1 | 2 |
| \[ country: Germany, age\_group: 20-30 ] | 1 | 2 |
| \[ *null* ] | 1 | 2 |
| \[ age\_group: 20-30 ] | 1 | 2 |
| \[ gender: Female ] | 1 | 2 |
| \[ gender: Female, country: Germany ] | 1 | 2 |
| \[ gender: Female, country: Germany, age\_group: 20-30 ] | 1 | 2 |
| \[ gender: Female, age\_group: 20-30 ] | 1 | 2 |

***

### Example 4: Edge case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.a
* **Items column:** `customer_attributes`
* **Minimum support:** 0.0

**Input:**

| customer\_attributes |
| ----- |
| \[ age\_group: 20-30, country: Germany, gender: Female ] |
| \[ age\_group: 20-30, country: Germany, gender: Male ] |

**Output:**

| pattern | pattern\_occurrence | total\_count |
| ----- | ----- | ----- |
| \[ gender: Male ] | 1 | 2 |
| \[ gender: Male, country: Germany ] | 1 | 2 |
| \[ gender: Male, country: Germany, age\_group: 20-30 ] | 1 | 2 |
| \[ gender: Male, age\_group: 20-30 ] | 1 | 2 |
| \[ age\_group: 20-30 ] | 2 | 2 |
| \[ country: Germany ] | 2 | 2 |
| \[ country: Germany, age\_group: 20-30 ] | 2 | 2 |
| \[ gender: Female ] | 1 | 2 |
| \[ gender: Female, country: Germany ] | 1 | 2 |
| \[ gender: Female, country: Germany, age\_group: 20-30 ] | 1 | 2 |
| \[ gender: Female, age\_group: 20-30 ] | 1 | 2 |

***
