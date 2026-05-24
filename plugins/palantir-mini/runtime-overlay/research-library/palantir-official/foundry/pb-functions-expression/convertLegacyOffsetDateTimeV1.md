---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/convertLegacyOffsetDateTimeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/convertLegacyOffsetDateTimeV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "56cdb17e3ac2d9521611d4d5366aba16491d451e9a0ae29fac1f08e3bb82d418"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Convert legacy OffsetDateTime"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert legacy OffsetDateTime

> Supported in: Batch

Converts a legacy OffsetDateTime column to a timestamp that can be used in all Foundry pipelines. The timestamp is returned in UTC.

**Expression categories:** Datetime

## Declared arguments

* **Expression:** *no description*<br>*Expression\<Struct\<timestamp:Timestamp, offset:Integer>>*

**Output type:** *Timestamp*
