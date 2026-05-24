---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/groupedGeometryEnvelopeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/groupedGeometryEnvelopeV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f68e46b81139e7df5b5dc3dd79262d49d2a236d1b280773bc0e5d0477d1c0c64"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Grouped geometry envelope"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Grouped geometry envelope

> Supported in: Batch, Faster

Returns the envelope of all valid geometries in the given column. Invalid geometries are treated as null and ignored.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** Column of geometries to compute the envelope of.<br>*Expression\<Geometry>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geometry`

**Given input table:**

| geometry |
| ----- |
| {"type":"LineString","coordinates":\[\[1,0],\[0,8.4]]} |
| {"type":"Point","coordinates":\[125.6, -92.3]} |
| {"type":"Polygon","coordinates":\[\[\[0,0],\[1,6.3],\[-6,1],\[0,0]]]} |

**Outputs:** {"type":"Polygon","coordinates":\[\[\[-6.0,-92.3],\[-6.0,8.4],\[125.6,8.4],\[125.6,-92.3],\[-6.0,-92.3]]]}

***

### Example 2: Null case

**Argument values:**

* **Expression:** `geometry`

**Given input table:**

| geometry |
| ----- |
| *null* |

**Outputs:** *null*

***

### Example 3: Edge case

**Argument values:**

* **Expression:** `geometry`

**Given input table:**

| geometry |
| ----- |
| Invalid GeoJSON |
| {"type":"LineString","coordinates":\[\[2,0],\[0,4.8]]} |

**Outputs:** {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,4.8],\[2.0,4.8],\[2.0,0.0],\[0.0,0.0]]]}

***
