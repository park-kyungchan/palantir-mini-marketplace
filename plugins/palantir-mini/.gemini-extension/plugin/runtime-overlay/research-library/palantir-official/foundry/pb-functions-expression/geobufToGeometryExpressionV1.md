---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geobufToGeometryExpressionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geobufToGeometryExpressionV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0dea20bbf61da7fb39a502e61e4763fd7d14489c7809ac690748663f7f5814a9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Decode Geobuf as GeoJSON"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Decode Geobuf as GeoJSON

> Supported in: Batch, Streaming

Decode Geobuf geometry as GeoJSON.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** Geobuf geometry to decode.<br>*Expression\<Geobuf>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geobuf`

| geobuf | **Output** |
| ----- | ----- |
| MgwIABoIgKDCHoCKqDc= | {"type":"Point","coordinates": \[32.0, 58.0]} |
| *null* | *null* |
| MgwIABoIre7HRuzg7iY= | {"type":"Point","coordinates": \[-73.989015, 40.753206]} |

***
