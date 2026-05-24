---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/extractEmailBodyV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/extractEmailBodyV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "16147e60a2d04a839f2cfd14e6689b6eca88a06ad7fbfb858955776cb8cd7245"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract email body"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract email body

> Supported in: Batch

Extracts the email body from an email media item as either plain text or html.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The email media item to extract the body from.<br>*Expression\<Media reference>*
* *optional* **Error handling:** Determines the behavior of the pipeline for inputs that fail to process.<br>*Enum\<FAIL, NULL>*
* *optional* **Output format:** The format to return the extracted email body as. Defaults to plain text.<br>*Enum\<HTML, Plain Text>*

**Output type:** *String*
