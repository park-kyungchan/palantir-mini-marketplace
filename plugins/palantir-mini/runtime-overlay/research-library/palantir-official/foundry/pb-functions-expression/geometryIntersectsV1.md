---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/geometryIntersectsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/geometryIntersectsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "91eb589c415e092c4054437f5219d5299c4190bbce60c7f1268a701eb9a60350"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Geometries have intersection"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometries have intersection

> Supported in: Batch, Faster, Streaming

Determines if two geometries intersect.

**Expression categories:** Geospatial

## Declared arguments

* **Geometry a:** Geometry a.<br>*Expression\<Geometry>*
* **Geometry b:** Geometry b.<br>*Expression\<Geometry>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Geometry a:** `geometry_a`
* **Geometry b:** `geometry_b`

| geometry\_a | geometry\_b | **Output** |
| ----- | ----- | ----- |
| {"coordinates":\[\[\[-112.94377956164206,34.81725414459382],\[-112.94377956164206,30.006795384733323], \[... | {"coordinates":\[\[\[-103.78627755867336,33.162750522563925],\[-103.78627755867336,28.29724741894266],\[-... | true |
| {"coordinates":\[\[\[0.3651446504365481,15.159518507965103],\[0.3651446504365481,13.427462911044273],\[3.... | {"coordinates":\[\[\[5.656394524666183,13.405417496831944],\[5.656394524666183,11.29869961209053],\[8.551... | false |

***
