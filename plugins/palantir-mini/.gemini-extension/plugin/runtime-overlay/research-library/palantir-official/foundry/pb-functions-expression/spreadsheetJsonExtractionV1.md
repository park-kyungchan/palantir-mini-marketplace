---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/spreadsheetJsonExtractionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/spreadsheetJsonExtractionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6e19941e8f548c60bd0808b80211b84024af5516bb32c6f01a9e7631b5377295"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract content from spreadsheets in JSON"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract content from spreadsheets in JSON

> Supported in: Batch

Extract content from all sheets a spreadsheet in JSON format.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The spreadsheet to extract content from.<br>*Expression\<Media reference>*
* *optional* **Error handling:** Determines the behavior of the pipeline for inputs that fail to process.<br>*Enum\<FAIL, NULL>*
* *optional* **Output fields:** Output fields to include.<br>*Set\<Enum\<Merged cells, Table>>*

**Output type:** *Map\<String, Struct>*
