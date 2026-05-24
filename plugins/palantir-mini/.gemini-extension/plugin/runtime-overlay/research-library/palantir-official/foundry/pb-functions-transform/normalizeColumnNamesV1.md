---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/normalizeColumnNamesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/normalizeColumnNamesV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "adad7e5d11a68d9bb6c50f11b6eaa6d4cb91222a230374c14e3ac35c9e072865"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Normalize column names"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Normalize column names

> Supported in: Batch, Faster, Streaming

Normalizes column names to use lower\_snake\_case.

**Transform categories**: Data preparation

## Declared arguments

* **Dataset:** Dataset to normalize column names.<br>*Table*
* *optional* **Remove special characters:** Removes all instances of @~\`!#$%^&=\*+':"/?>< from column names.<br>*Literal\<Boolean>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Remove special characters:** *null*

**Input:**

| recentlyServiced | tailNumber | \_airlineCode |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

***

### Example 2: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Remove special characters:** true

**Input:**

| recently^Serviced | tail@Number$ | !airline\*Code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

***

### Example 3: Edge case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Remove special characters:** *null*

**Input:**

| columnA. | columnB() | column!C | column,;{}    D | column()e |
| ----- | ----- | ----- | ----- | ----- |
| foo | bar | fooBar | foo | bar |

**Output:**

| column\_a | column\_b | column!\_c | column\_d | column\_e |
| ----- | ----- | ----- | ----- | ----- |
| foo | bar | fooBar | foo | bar |

***
