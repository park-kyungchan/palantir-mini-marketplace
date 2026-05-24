---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/getImageryMetadataV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/getImageryMetadataV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4e6b58068555e79b6c350198310ebe2da421731006fbf632acc60f41e937a628"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract imagery metadata"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract imagery metadata

> Supported in: Batch, Streaming

Extracts metadata fields from an image.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The column containing media references to imagery in the media set.<br>*Expression\<Media reference>*
* **Metadata to include:** Select the metadata columns to include in the output.
  For metadata columns that do not apply for the given image, the value will be null. For example, geo metadata should only be relevant for images with geospatial context such as satellite imagery with world coordinates. If this does not apply to the image, this field will return null.<br>*Set\<Enum\<Attributes, Bands, Bytes, Dimensions, EXIF Image Location, Format, Geographic Metadata, ICC Profile>>*

**Output type:** *Struct*

## Examples

### Example 1: Base case

**Argument values:**

* **Media reference:** `Media Reference`
* **Metadata to include:** \[`Attributes`, `Bands`, `Bytes`, `Dimensions`, `Format`, `Geographic Metadata`, `ICC Profile`, `EXIF Image Location`]

| Media Reference | **Output** |
| ----- | ----- |
| {"mimeType":"image/tiff","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | {<br> **attributes**: {<br> outer\_key1 -> {<br> inner\_key1 -> inner\_value1,<br>},<br>... |

***

### Example 2: Base case

**Argument values:**

* **Media reference:** `Media Reference`
* **Metadata to include:** \[`Bands`, `Dimensions`, `Geographic Metadata`]

| Media Reference | **Output** |
| ----- | ----- |
| {"mimeType":"image/tiff","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | {<br> **bands**: \[ {<br> **color\_interpretation**: RED,<br> **type**: BYTE,<br>}, {\<b... |

***

### Example 3: Base case

**Argument values:**

* **Media reference:** `Media Reference`
* **Metadata to include:** \[`ICC Profile`]

| Media Reference | **Output** |
| ----- | ----- |
| {"mimeType":"image/tiff","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | {<br> **icc\_profile**: some-icc-profile,<br>} |

***
