---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/emptyTableV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/emptyTableV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d43837d57e151a1eb12a56094e94271a623c52fbdaf3b7638aa8abe3f958d3b8"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Empty table"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Empty table

> Supported in: Batch, Faster, Streaming

Creates an empty table with the given schema and read mode.

**Transform categories**: Other

## Declared arguments

* **Schema:** A schema to be used for the output contract.<br>*Type\<Struct>*
* *optional* **Read mode:** The read mode of the empty dataset.<br>*Enum\<INCREMENTAL, SNAPSHOT, STREAM, UNKNOWN>*

## Examples

### Example 1: Base case

**Argument values:**

* **Schema:** Struct\<flight\_code:Integer, flight\_number:String, airline:String>
* **Read mode:** *null*

**Inputs:**

**Output:**

| flight\_code | flight\_number | airline |
| ----- | ----- | ----- |

***
