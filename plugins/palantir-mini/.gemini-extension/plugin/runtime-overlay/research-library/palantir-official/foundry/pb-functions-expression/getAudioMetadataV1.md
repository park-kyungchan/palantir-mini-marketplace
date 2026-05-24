---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/getAudioMetadataV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/getAudioMetadataV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0a5e677ea10bb30c64569506bf8d497cf2e246ff9bfc0f845ace5e284517a462"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract audio metadata"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract audio metadata

> Supported in: Batch

Extracts metadata fields from an audio file.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The column containing media references to audio files in the media set.<br>*Expression\<Media reference>*
* **Metadata to include:** Select the metadata fields to include in the output.<br>*Set\<Enum\<Audio specification, Bytes, Format>>*

**Output type:** *Struct*

## Examples

### Example 1: Base case

**Argument values:**

* **Media reference:** `Media Reference`
* **Metadata to include:** \[`Format`, `Specification`, `Bytes`]

| Media Reference | **Output** |
| ----- | ----- |
| {"mimeType":"audio","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | {<br> **bytes**: 156700,<br> **format**: audio,<br> **specification**: {<br> \*\*b... |

***
