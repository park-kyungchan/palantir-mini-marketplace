---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/parseCsvV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/parseCsvV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f00f1ed701b7ef794b96f60c0d27cca83ba58ae9c81589105f13cc553b327987"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from a CSV file"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from a CSV file

> Supported in: Batch

Reads a dataset of files and parses each CSV file into rows.

**Transform categories**: File

## Declared arguments

* **Dataset:** Dataset of files to process.<br>*Files*
* **Schema:** Schema definition used when parsing the CSV files.<br>*Type\<Struct>*
* *optional* **Allow multiline:** Specifies whether the parsing should allow for rows split across multiple lines. The default is set to false.<br>*Literal\<Boolean>*
* *optional* **Column delimiter:** Provides the delimiter used in the CSV file. The default delimiter is the comma.<br>*Literal\<String>*
* *optional* **Custom escape character:** Sets a single character used for escaping quotes inside an already quoted value.<br>*Literal\<String>*
* *optional* **Custom quote character:** Sets a single character for escaping quoted values where the separator can be part of the value. For reading, if you would like to turn off quotations, set the value to an empty string. The default value is the quote (").<br>*Literal\<String>*
* *optional* **Encoding:** Character encoding of the input files.<br>*Enum\<ISO\_8859\_1, US\_ASCII, UTF\_16, UTF\_16BE, UTF\_16LE, UTF\_8, Windows-31J>*
* *optional* **Include last modified timestamp:** Specifies whether the output dataset should contain the file's last modified timestamp. The default value is false.<br>*Literal\<Boolean>*
* *optional* **Includes header:** Specifies whether the CSV file contains the header. The default value is false.<br>*Literal\<Boolean>*
