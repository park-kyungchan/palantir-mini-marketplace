---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/parseGeoJsonV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/parseGeoJsonV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4a98dd91f35009a977c8b11d348935c696c0559b4eb5580d0f0c2a6245d3d149"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from a GeoJSON file"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from a GeoJSON file

> Supported in: Batch

Reads a dataset of files and parses each GeoJSON file into rows. The output dataset will have a geometry column, and a column for each property listed by the user, apart from the \_error and \_file columns. If the user provides no properties to extract, the entire properties struct will be extracted into a properties column as a string. All GeoJSONs in the files must either be:
a) multiline FeatureCollection: an entire file with one GeoJSON of type FeatureCollection
b) single-line Feature: a file where every line is a fully valid GeoJSON of type Feature.

**Transform categories**: File, Geospatial

## Declared arguments

* **Dataset:** Dataset of GeoJSON files to process.<br>*Files*
* **Multiline:** If every line in each file is a fully valid GeoJSON of type Feature, set this to false. If the entire file is a valid GeoJSON of type FeatureCollection, set this to true.<br>*Literal\<Boolean>*
* *optional* **List of properties:** List of properties and their types that need to be extracted from these GeoJSON files. If no value or an empty struct is provided, extracts all 'properties' in one properties column as a string.<br>*Type\<Struct>*
* *optional* **Source coordinate system:** Coordinate system identifier formatted as "authority:id". For example, UTM zone 18N could be identified by EPSG:32618. If not specified, will default to WGS84 which is EPSG:4326.<br>*Literal\<String>*
