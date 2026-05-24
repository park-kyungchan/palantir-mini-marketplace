---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/loadMediaReferencesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/loadMediaReferencesV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9d66e439717bfdc82478a0ff32263fba75501348dacfe17ed2470b8f9ec973c8"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Get media references (datasets)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get media references (datasets)

> Supported in: Batch

Produces a dataset containing media references and basic metadata for files in a dataset.

**Transform categories**: File

## Declared arguments

* **Dataset:** Dataset of files to load media references for.<br>*Files*
* *optional* **Forces the mime type:** Forces the mime type value for each media reference. If not set, then each file will be read to detect a mime type.<br>*Enum\<BMP, CSV, FLAC, H264, JP2K, JPEG, JSON, MP4, MP4\_AUDIO, MPEG, and more ...>*
