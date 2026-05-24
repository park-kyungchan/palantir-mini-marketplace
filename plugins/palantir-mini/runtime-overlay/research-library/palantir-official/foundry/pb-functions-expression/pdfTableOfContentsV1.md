---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/pdfTableOfContentsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/pdfTableOfContentsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "06477d5bc3e2b870320e39272b385d397583c426183fa794b86db7d46195d579"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract table of contents from PDF"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract table of contents from PDF

> Supported in: Batch, Faster

Produces a table of contents from a PDF based on the headings used within the document.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The column containing media references to PDF files in a media set.<br>*Expression\<Media reference>*

**Output type:** *Array\<Struct\<level:Integer, title:String, page:Integer>>*

## Examples

### Example 1: Base case

**Argument values:**

* **Media reference:** `Media Reference`

| Media Reference | **Output** |
| ----- | ----- |
| {"mimeType":"application/pdf","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.test.media-set.1","mediaItemRid":"ri.mio.test.media-item.1"}}} | \[ {<br> **level**: 0,<br> **page**: 2,<br> **title**: Chapter 1,<br>}, {<br> \*\*l... |

***
