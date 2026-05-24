---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/parseJsonV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/parseJsonV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e42720ef6289927a36696b810107f3de7623ddfb8cecd7e93416d9503caa08ad"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from a JSON file"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from a JSON file

> Supported in: Batch

Reads a dataset of files and parses each JSON file into rows.

**Transform categories**: File, String, Struct

## Declared arguments

* **Allow JSON values to span multiple lines:** If off, a single JSON record must be entirely on one line. If on, a single JSON record may span multiple lines.<br>*Literal\<Boolean>*
* **Dataset:** Dataset of files to process.<br>*Files*
* **Schema:** Schema definition used when parsing the JSON files.<br>*Type\<Struct>*
