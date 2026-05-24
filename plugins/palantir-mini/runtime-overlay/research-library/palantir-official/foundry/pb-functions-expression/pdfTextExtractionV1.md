---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/pdfTextExtractionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/pdfTextExtractionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ecf43bfc400dd0714a1af1296a2ca49cf89a5b7815d1d59cd7349de61d810a2a"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract text from PDF"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract text from PDF

> Supported in: Batch, Faster

Extracts raw text from the pages in a PDF.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The column containing media references to PDF files in a media set.<br>*Expression\<Media reference>*
* *optional* **End page:** The end of the page range (inclusive).<br>*Expression\<Integer>*
* *optional* **Error handling:** Determines the behavior of the pipeline for inputs that fail to process.<br>*Enum\<FAIL, NULL>*
* *optional* **Start page:** The start of the page range. If no value is provided, it will default to the first page.<br>*Expression\<Integer>*

**Output type:** *Array\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Media reference:** `Media Reference`
* **End page:** `End Page`
* **Error handling:** *null*
* **Start page:** `Start Page`

| Media Reference | Start Page | End Page | **Output** |
| ----- | ----- | ----- | ----- |
| {"mimeType":"application/pdf","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | 1 | 2 | \[ first page, second page ] |

***
