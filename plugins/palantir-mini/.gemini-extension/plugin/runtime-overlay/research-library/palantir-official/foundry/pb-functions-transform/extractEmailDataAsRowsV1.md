---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/extractEmailDataAsRowsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/extractEmailDataAsRowsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f786a18ce3e0f77ce1f47986f79088416794bbf991210cdc748632e422c3f6a8"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from a dataset of email files"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from a dataset of email files

> Supported in: Batch

Reads a dataset of email files and parses each file into a row. Supported file extensions: .eml, .emltpl, and .msg.

**Transform categories**: File, Media

## Declared arguments

* **Dataset:** Dataset of email files to process.<br>*Files*
* **Email information to extract:** Metadata columns to include.<br>*Set\<Enum\<Attachments, Bcc, Body (HTML), Body (Plain), Cc, File Name, File Path, From, Headers, ID, and more ...>>*
