---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/parseExcelV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/parseExcelV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "38cc9a70bfeeefa755678acaf2fa95a98855f27c33ba950c848efce2b9d04cc2"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Extract rows from an Excel file"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract rows from an Excel file

> Supported in: Batch

Reads a dataset of Microsoft Excel files and parses each file into rows. Supported file formats: .xls, .xlt, .xltm, .xltx, .xlsx, .xlsm.

The processing of individual Excel files is not distributed across multiple Spark executors, so we recommend enabling the usage of local Spark in build settings if the input dataset is expected to have exactly one file.

Particularly large Excel files can require a lot of memory to process, so if you observe builds failing with out-of-memory errors, consider using custom build settings with increased executor memory (or increased driver memory in the case of local Spark). For such large files, it may not be possible to preview the output, but deployment can still succeed given appropriate build settings.

**Transform categories**: File

## Declared arguments

* **Dataset:** Dataset of files to process.<br>*Files*
* **Rows to skip:** Number of rows to skip at the start of each sheet. If you do not use the "Treat first row (after skipping) as header" option and a header is present, this value should include the header row.<br>*Literal\<Integer>*
* **Schema:** An ordered list of column names corresponding to data in the sheets that match the specified pattern.<br>*List\<Literal\<String>>*
* **Source sheet pattern:** Data will be extracted from all sheets whose names contain a substring matching this regular expression. If you specify the empty string (the default value for this parameter), data will be extracted from all sheets. To do a full-string match instead of a substring match, you can add ^ at the start and $ at the end of the string.<br>*Literal\<String>*
* *optional* **Output column to put the file path:** If present, an output column will be created with this column name, containing the path of the parsed file.<br>*Literal\<String>*
* *optional* **Output column to put the row number:** If present, an output column will be created with this column name, containing the 1-indexed row number of the parsed row.<br>*Literal\<String>*
* *optional* **Output column to put the sheet name:** If present, an output column will be created with this column name, containing the sheet name of the parsed row.<br>*Literal\<String>*
* *optional* **Treat first row (after skipping) as header:** If true, the first row in each sheet after skipping will be treated as a header, and the order of the fields in that header will be used to determine the mapping between the columns in the sheet and the columns in the schema. The order of the fields can differ between sheets (and files), and it is neither necessary for all fields specified in the schema to be present in all sheets nor for all fields present in the Excel sheets to be included in the schema. The strings present in the cell values of the header row will be mapped to the schema column names case-insensitively after applying the following sanitization and disambiguation steps:

  1. If present, remove any string-initial sequence of any combination of the characters ` (),;{}\n\t=` (the first character in this list is the ASCII space).
  2. Replace all remaining instances of ` (),;{}\n\t=` with underscores.
  3. Replace all consecutive underscores with one underscore.
  4. If the string now ends with an underscore, remove that underscore.
  5. If the string's length is now 0, replace the string with `_untitled_column`.
  6. After applying steps 1 through 5 to each string, if the same string value (ignoring case) appears more than once, append an underscore and number suffix to the second instance onward (the first suffix added this way will be `_2`).

  *Literal\<Boolean>*
