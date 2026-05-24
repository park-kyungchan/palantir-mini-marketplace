---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/h3NeighborsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/h3NeighborsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "baed40b5188ed290b0fabc9ca9322be040a585656d9c766fc3e5d0148e747e6e"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Get neighbors of an H3 index"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get neighbors of an H3 index

> Supported in: Batch, Faster, Streaming

Get all neighbors of an H3 index.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** A valid H3 index.<br>*Expression\<H3 Index>*

**Output type:** *Array\<H3 Index>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `h3Index`

| h3Index | **Output** |
| ----- | ----- |
| 8843a13687fffff | \[ 8843a13681fffff, 8843a13683fffff, 8843a13685fffff, 8843a136abfffff, 8843a136b9fffff, 8843a136bdfffff ] |
| 85283473fffffff | \[ 8528340bfffffff, 8528340ffffffff, 85283447fffffff, 85283463fffffff, 85283477fffffff, 8528347bfffffff ] |
| 860800007ffffff | \[ 860800017ffffff, 86080001fffffff, 860800027ffffff, 86080002fffffff, 860800037ffffff ] |
| Invalid h3 index | *null* |
| *null* | *null* |

***
