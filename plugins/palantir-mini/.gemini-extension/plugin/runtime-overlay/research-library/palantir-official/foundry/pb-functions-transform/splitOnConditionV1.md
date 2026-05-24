---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/splitOnConditionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/splitOnConditionV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1b0753570632516aa597ac3071f6f909e550e2f5e186c484b37782bedcf660dc"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Split on condition"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Split on condition

> Supported in: Batch, Faster

Split an input into two outputs based on chosen condition.

**Transform categories**: Other

## Declared arguments

* **Condition:** Rows where this condition is true will be split into the true output, and rows where this condition is false will be split into the false output.<br>*Expression\<Boolean>*
* **Input:** The input to split.<br>*Table*
