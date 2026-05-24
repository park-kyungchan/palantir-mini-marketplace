---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryExplodeToArrayV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryExplodeToArrayV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "916f1c48ad2dfba3130cd77cc6431deec3fce4da8570fe67178e739d805454e1"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometry explode to array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry explode to array

> Supported in: Batch, Faster, Streaming

Converts a geometry to an array of its constituent simple geometries.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** The geometry to explode.<br>*Expression\<Geometry>*

**Output type:** *Array\<Geometry>*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} | \[ {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} ] |
| {"type":"MultiPolygon","coordinates":\[\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]],\[\[\[5.0,5.0],\[5.0,6.0],\[6.0,6.0],\[6.0,5.0],\[5.0,5.0]]]]} | \[ {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]}, {"type":"Polygon","coordinates":\[\[\[5.0,5.0],\[5.0,6.0],\[6.0,6.0],\[6.0,5.0],\[5.0,5.0]]]} ] |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| {"type": "GeometryCollection", "geometries": \[{"type": "MultiPoint", "coordinates": \[\[0, 0], \[1, 1]]}, {"type": "Polygon", "coordinates": \[\[\[0, 0], \[0, 1], \[1, 1], \[1, 0], \[0, 0]]]}]} | \[ {"type":"Point","coordinates":\[0.0,0.0]}, {"type":"Point","coordinates":\[1.0,1.0]}, {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,1.0],\[1.0,1.0],\[1.0,0.0],\[0.0,0.0]]]} ] |

***

### Example 3: Null case

**Argument values:**

* **Expression:** `geometry`

| geometry | **Output** |
| ----- | ----- |
| *null* | *null* |

***
