---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryToGeobufExpressionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryToGeobufExpressionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c8da5fde448a374f86d79b540019b932728f5e44a76f83ebd622c1e32b353f7b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Encode GeoJSON as Geobuf"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Encode GeoJSON as Geobuf

> Supported in: Batch, Faster, Streaming

Encodes GeoJSON geometry as Geobuf.

**Expression categories:** Geospatial

## Declared arguments

* **Geometry:** Geometry to convert to Geobuf.<br>*Expression\<Geometry>*
* *optional* **Dimensions:** Number of dimensions per coordinate encoded in the Geobuf.<br>*Expression\<Integer>*
* *optional* **Precision:** Number of preserved decimals after the decimal point.<br>*Expression\<Integer>*

**Output type:** *Geobuf*

## Examples

### Example 1: Base case

**Argument values:**

* **Geometry:** `geojson`
* **Dimensions:** *null*
* **Precision:** *null*

| geojson | **Output** |
| ----- | ----- |
| {"type":"Point","coordinates": \[32.0, 58.0]} | MgwIABoIgKDCHoCKqDc= |
| *null* | *null* |
| {"type":"Point","coordinates": \[-73.989015, 40.753206]} | MgwIABoIre7HRuzg7iY= |

***
