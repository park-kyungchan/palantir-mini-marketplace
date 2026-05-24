---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/parseGeoJsonAsGeometryV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/parseGeoJsonAsGeometryV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f77108d17064adae4b38aa6811b005128a46e66fb87d035ef7180be9c699222b"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Parse GeoJSON from a non-WGS 84 coordinate system"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Parse GeoJSON from a non-WGS 84 coordinate system

> Supported in: Batch, Faster, Streaming

Convert GeoJSON string from a non-WGS 84 coordinate system to WGS 84 geometry. For GeoJSON already in WGS 84 (longitude, latitude), the "logical type cast" expression can convert directly with less overhead. Returns null for strings that fail during parsing or conversion.

**Expression categories:** Geospatial

## Declared arguments

* **GeoJSON string:** GeoJSON as a string. Note that not all GeoJSON strings are indexable by the Ontology; use the "normalize geometry" expression to prepare geometry prior to Ontology use.<br>*Expression\<String>*
* **Source coordinate system:** Coordinate system identifier formatted as "authority:id". For example, UTM zone 18N could be identified by EPSG:32618.<br>*Literal\<String>*

**Output type:** *Geometry*

## Examples

### Example 1: Base case

**Argument values:**

* **GeoJSON string:** `geojson_string`
* **Source coordinate system:** EPSG:32618

| geojson\_string | **Output** |
| ----- | ----- |
| {"type":"Point","coordinates":\[320000.0,4300000.0]} | {"type":"Point","coordinates":\[-77.07368071728229,38.83040844313318]} |
| {"type":"LineString","coordinates":\[\[320000.0,4300000.0],\[320100.0,4300000.0]]} | {"type":"LineString","coordinates":\[\[-77.07368071728229,38.83040844313318],\[-77.0725293738795,38.83042888342659]]} |
| {"type":"Polygon","coordinates":\[\[\[320000.0,4300000.0],\[320100.0,4300000.0],\[320000.0,4300100.0],\[320000.0,4300000.0]]]} | {"type":"Polygon","coordinates":\[\[\[-77.07368071728229,38.83040844313318],\[-77.0725293738795,38.83042888342659],\[-77.07370685720375,38.83130901341597],\[-77.07368071728229,38.83040844313318]]]} |

***

### Example 2: Null case

**Argument values:**

* **GeoJSON string:** `geojson_string`
* **Source coordinate system:** EPSG:32618

| geojson\_string | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 3: Edge case

**Argument values:**

* **GeoJSON string:** `geojson_string`
* **Source coordinate system:** EPSG:32618

| geojson\_string | **Output** |
| ----- | ----- |
| invalid geojson string | *null* |

***
