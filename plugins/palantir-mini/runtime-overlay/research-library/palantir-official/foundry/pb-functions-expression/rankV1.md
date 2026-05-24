---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/rankV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/rankV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bceb229c66fd6c94022d5c506fbf90e1f6987c90b4003ff487532503d6ce92e9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Rank"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Rank

> Supported in: Batch, Faster

Returns the rank of rows within a window partition. In case of ties the rows get same rank. The difference between rank and dense\_rank is that rank leaves gaps in ranking sequence when there are ties.

**Expression categories:** Aggregate

## Declared arguments

This function does not take any arguments.

**Output type:** *Integer*
