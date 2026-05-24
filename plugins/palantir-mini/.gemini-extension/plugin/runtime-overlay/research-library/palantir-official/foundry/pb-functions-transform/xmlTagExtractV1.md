---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/xmlTagExtractV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/xmlTagExtractV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "82971e96722164e24ca5df9d72c093a24d20ba2bef9f89952848751dec3996fe"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from an XML file"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from an XML file

> Supported in: Batch

Reads a dataset of files and parses each XML file into rows.

**Transform categories**: File

## Declared arguments

* **Dataset:** Dataset of files to process.<br>*Files*
* **Schema:** Schema definition used when parsing the xml files.<br>*Type\<Struct>*
* **XML tag:** XML tag that will be used as basis to generate one row per tag.<br>*Literal\<String>*
* *optional* **Attribute prefix:** Prefix for attributes on tags.<br>*Literal\<String>*
* *optional* **Encoding:** The encoding type (character set) of the input file.<br>*Enum\<ISO\_8859\_1, US\_ASCII, UTF\_16, UTF\_16BE, UTF\_16LE, UTF\_8, Windows-31J>*
* *optional* **Value tag:** The tag used for the value when there are attributes in the element having no child.<br>*Literal\<String>*
