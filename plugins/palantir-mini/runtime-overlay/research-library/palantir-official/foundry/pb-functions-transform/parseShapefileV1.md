---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/parseShapefileV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/parseShapefileV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b4daa43dd5b71dbbdaa7ddde4669385fa336721d6d12b75b2265c1f277c20fd1"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from shapefile"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from shapefile

> Supported in: Batch

Reads a dataset of files and parses each shapefile into rows. All files except .shp, .shx and .dbf files will be ignored. This shapefile parser only supports point, polyline, polygon and multipoint geometry types. The output dataset will have a geometry column, and a column for each property listed by the user, apart from the \_error and \_file columns. If the user provides no properties to extract, the entire properties struct will be extracted into a properties column as a string. UTF-8 is the only supported encoding for property names and values (even if a .cpg file that specifies an alternative coding exists, it will be ignored).

**Transform categories**: File, Geospatial

## Declared arguments

* **Dataset:** Dataset of shapefiles to process. Each shapefile must have a .shp, .shx and a .dbf file. All files of a shapefile must have the same name. For example, a dataset with these files has two shapefiles (shapefile1, and shapefile2): shapefile1.shp, shapefile1.shx, shapefile1.dbf, folder/shapefile2.shp, folder/shapefile2.shx, folder/shapefile2.dbf.<br>*Files*
* *optional* **List of properties:** List of properties and their types that need to be extracted from these shapefiles. If no value or an empty struct is provided, extracts all properties in one 'properties' column as a string.<br>*Type\<Struct>*
* *optional* **Source coordinate system:** Coordinate system identifier formatted as "authority:id". For example, UTM zone 18N could be identified by EPSG:32618. If not specified, will default to WGS84 which is EPSG:4326. Input geometries will be converted from this coordinate system to EPSG:4326 in order to standardize downstream transformations.<br>*Literal\<String>*
