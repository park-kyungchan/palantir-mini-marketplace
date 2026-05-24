---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/gzipDecompressV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/gzipDecompressV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f0f360fd803715a4ccdb7a3b8e94e0c8aa58cba0cb0b53f86593fee0cb4590ea"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Gzip decompress"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Gzip decompress

> Supported in: Batch, Faster, Streaming

Decompresses gzip-compressed binary into a string.

**Expression categories:** File

## Declared arguments

* **Expression:** *no description*<br>*Expression\<Binary>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `gzip`

| gzip | **Output** |
| ----- | ----- |
| H4sIAAAAAAAA//NIzcnJ11Eozy/KSVEEAObG5usNAAAA | Hello, world! |

***
