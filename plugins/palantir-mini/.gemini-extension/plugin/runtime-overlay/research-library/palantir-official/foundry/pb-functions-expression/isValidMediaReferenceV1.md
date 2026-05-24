---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidMediaReferenceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidMediaReferenceV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "55f0492e64dc2df8a80fa92e9f2a6bd9f907087a6a41faf136e58504a022700a"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid media reference"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid media reference

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid Foundry media reference.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** String representing a media reference.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `mediaRef`

| mediaRef | **Output** |
| ----- | ----- |
| {"mimeType":"PDF","reference":{"type":"datasetFile","datasetFile":{"fileReference":{"datasetRid":"ri.foundry.main.dataset.a","ref":"master","logicalFilePath":"file.pdf"}}}} | true |
| {"mimeType":"PDF","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.main.media-set.a", "mediaItemRid":"ri.mio.main.media-item.a"}}} | true |
| not a media reference | false |

***
