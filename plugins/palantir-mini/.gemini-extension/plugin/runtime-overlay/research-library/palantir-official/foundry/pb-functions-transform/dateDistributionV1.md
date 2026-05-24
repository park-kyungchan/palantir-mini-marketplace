---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/dateDistributionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/dateDistributionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "14f39134bf22a545fb0e65fffbed1f80659612d45e91f43991c2db9c42145e76"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Date distribution"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Date distribution

> Supported in: Batch

Computes the distribution of dates/timestamps in a specified column.

**Transform categories**: Datetime

## Declared arguments

* **Column:** Column to compute distribution for.<br>*Column\<Date | Timestamp>*
* **Dataset:** Dataset to apply distribution to.<br>*Table*
* **End time:** End time for distribution. Any time after will be ignored.<br>*Literal\<Date | Timestamp>*
* **Start time:** Start time for distribution. Any time before will be ignored.<br>*Literal\<Date | Timestamp>*
* **Time bucket:** The time unit to use for buckets.<br>*Enum\<Day, Hour, Minute, Month, Second, Week, Year>*
