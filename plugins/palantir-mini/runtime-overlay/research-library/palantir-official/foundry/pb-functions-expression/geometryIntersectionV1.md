---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryIntersectionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryIntersectionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "375b4675da85b051e98245a5dbd4035b8207c26d8ca3bfa52d25d7082d9eeb3d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometry intersection"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry intersection

> Supported in: Batch, Faster, Streaming

Calculates the portion of geometry a that is intersecting geometry b.

**Expression categories:** Geospatial

## Declared arguments

* **Geometry a:** Geometry a.<br>*Expression\<Geometry>*
* **Geometry b:** Geometry b.<br>*Expression\<Geometry>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Geometry a:** `geometry_a`
* **Geometry b:** `geometry_b`

| geometry\_a | geometry\_b | **Output** |
| ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} | {"type":"Polygon","coordinates":\[\[\[0.5,0.0],\[1.5,0.0],\[1.5,1.0],\[0.5,1.0],\[0.5,0.0]]]} | {"type":"Polygon","coordinates":\[\[\[0.5,1.0],\[1.0,1.0],\[1.0,0.0],\[0.5,0.0],\[0.5,1.0]]]} |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} | {"type":"Polygon","coordinates":\[\[\[5.0,5.0],\[5.0,6.0],\[6.0,6.0],\[6.0,5.0],\[5.0,5.0]]]} | {"type":"Polygon","coordinates":\[\[]]} |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} | {"type":"Polygon","coordinates":\[\[\[1.0,0.0],\[1.0,1.0],\[2.0,1.0],\[2.0,0.0],\[1.0,0.0]]]} | {"type":"LineString","coordinates":\[\[1.0,1.0],\[1.0,0.0]]} |
| {"type":"Point","coordinates":\[0.0,0.0]} | {"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0]]} | {"type":"Point","coordinates":\[0.0,0.0]} |
| {"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0]]} | {"type":"Polygon","coordinates":\[\[\[2.0,0.0],\[2.0,1.0],\[3.0,1.0],\[3.0,0.0],\[2.0,0.0]]]} | {"type":"LineString","coordinates":\[]} |

***
