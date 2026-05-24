---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/extractFileMetadataAsRowsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/extractFileMetadataAsRowsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "68638df10ac6a99b3cf5e97aef97f1aac0c52848c3681efd22dcf01179be1ba6"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract file metadata from dataset as rows"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract file metadata from dataset as rows

> Supported in: Batch

Reads file metadata as rows from a dataset of files.

**Transform categories**: File

## Declared arguments

* **Dataset:** Dataset of files.<br>*Files*
* **Dataset information to include:** Additional metadata columns to include.<br>*Set\<Enum\<File modified timestamp, File size in bytes, Include input dataset branch, Input dataset rid>>*
