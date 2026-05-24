---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/timeBoundedEventTimeSortV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/timeBoundedEventTimeSortV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "708bc30fbd3f2f8426299357752a3339a96c3283c415a220f5a805f49e7b21c7"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Time bounded event time sort"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time bounded event time sort

> Supported in: Streaming

Emits rows by key in ascending event time order, allowing for late arriving records up until at least the allowed lateness. Records arriving after the allowed lateness plus some small buffer interval will be dropped.

**Transform categories**: Other

## Declared arguments

* **Allowed lateness time unit:** Unit for amount of time to wait for late arriving records to be sorted.<br>*Enum\<Days, Hours, Milliseconds, Minutes, Seconds, Weeks>*
* **Allowed lateness time value:** Value for amount of time to wait for late arriving records to be sorted.<br>*Literal\<Long>*
* **Dataset:** Dataset to sort rows.<br>*Table*
* *optional* **Key by columns:** Columns on which to partition the input by key. Each sort will be computed separately for each distinct key value.<br>*Set\<Column\<AnyType>>*
