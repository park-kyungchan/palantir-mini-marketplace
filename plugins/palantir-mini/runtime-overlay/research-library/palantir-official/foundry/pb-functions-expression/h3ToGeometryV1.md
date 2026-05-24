---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/h3ToGeometryV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/h3ToGeometryV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "acd630ed7f52ce3fbe724fca22521d8ff5c00d7e19f380707276706c23d22abb"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > H3 to geometry"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# H3 to geometry

> Supported in: Batch, Faster, Streaming

Convert H3 index to polygon.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** A valid H3 index.<br>*Expression\<H3 Index>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `h3`

| h3 | **Output** |
| ----- | ----- |
| 8029fffffffffff | {"type":"Polygon","coordinates":\[\[\[-121.3366283326517,28.653019311484535],\[-110.25748485653355,36.80... |
| 85283473fffffff | {"type":"Polygon","coordinates":\[\[\[-121.91508032705622,37.2713558667319],\[-121.86222328902491,37.353... |
| 8f2d55c256ac883 | {"type":"Polygon","coordinates":\[\[\[39.99999168658859,45.00000521415798],\[39.99999036498484,45.000000... |

***
