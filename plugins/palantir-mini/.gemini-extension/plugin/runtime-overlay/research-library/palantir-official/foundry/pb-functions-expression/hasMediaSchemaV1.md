---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/hasMediaSchemaV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/hasMediaSchemaV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e104606de2d92e3545671d8b59229463fb35b5a70e4bbc74fb225b5393059acb"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Has media schema"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Has media schema

> Supported in: Batch

Checks if a media reference has a specific schema type and format. This expression can be used as a filter condition to filter media sets by media type and allow downstream schema-specific transformations.

**Expression categories:** Media

## Declared arguments

* **Media format:** The format to assert.<br>*Enum\<BMP, DOCX, EML, FLAC, JP2K, JPEG, MKV, MOV, MP2, MP3, and more ...>*
* **Media reference:** The media reference to check.<br>*Expression\<Media reference>*
* **Media schema:** The schema to assert.<br>*Enum\<Audio, Document, Email, Image, Spreadsheet, Video>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Media format:** `png`
* **Media reference:** `mediaReference`
* **Media schema:** `imagery`

| mediaReference | **Output** |
| ----- | ----- |
| {"mimeType":"image/png","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | true |

***

### Example 2: Base case

**Argument values:**

* **Media format:** `wav`
* **Media reference:** `mediaReference`
* **Media schema:** `audio`

| mediaReference | **Output** |
| ----- | ----- |
| {"mimeType":"image/png","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | false |

***

### Example 3: Null case

**Argument values:**

* **Media format:** `png`
* **Media reference:** `mediaReference`
* **Media schema:** `imagery`

| mediaReference | **Output** |
| ----- | ----- |
| *null* | false |

***
