---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/denseRankV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/denseRankV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "90414e5ab2e9536cee5e8c9f78082a1290e2869fd230090c865205855e325d93"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Dense rank"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Dense rank

> Supported in: Batch, Faster

Returns the rank of rows within a window partition, without any gaps. In case of ties the rows get same rank. The difference between rank and dense\_rank is that dense\_rank leaves no gaps in ranking sequence when there are ties.

**Expression categories:** Aggregate

## Declared arguments

This function does not take any arguments.

**Output type:** *Integer*
