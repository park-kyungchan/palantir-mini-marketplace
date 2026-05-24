---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/parseKmlFilesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/parseKmlFilesV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "768a5084c7e7c97578c3b4562261ac9da60b8e8cbc7159e4e0bd80477593109b"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Parse KML files into geometry lists"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Parse KML files into geometry lists

> Supported in: Batch

Parses each raw KML file into a list of typed geometries.

**Transform categories**: File

## Declared arguments

* **Dataset:** Dataset of files to process.<br>*Files*
* *optional* **Should prepare:** Flag indicating whether to prepare the geometry for Ontology ingest after parsing. You should always prepare unless know that your input is invalid and still want to perform geospatial operations on it. Default to true.<br>*Literal\<Boolean>*
