---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidGeoJsonV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidGeoJsonV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b4d840cc0ebf9cfd05a811739d14c2f540440cc6346c4b38efb2dad720afc2a4"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid GeoJSON"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid GeoJSON

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid GeoJSON input string. Not all GeoJSON strings are indexable by the ontology; use the "prepare geometry" expression to prepare geometry prior to Ontology use.

**Expression categories:** Geospatial

## Declared arguments

* **Expression:** GeoJSON to check. Note that not all GeoJSON strings are indexable by the Ontology; use the "prepare geometry" expression to prepare geometry prior to Ontology use.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `geoJson`

| geoJson | **Output** |
| ----- | ----- |
| {"type":"Point","coordinates":\[3.0, 5.0, 2.0]} | true |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[1.0,0.0],\[0.0,1.0],\[0.0,0.0]]]} | true |
| {"type":"LineString","coordinates":\[\[0.0,0.0],\[1.0,0.0]]} | true |
| not a GeoJSON string | false |

***
