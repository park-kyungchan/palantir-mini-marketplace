---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/loadMediaSetReferencesV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/loadMediaSetReferencesV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "edb7b00559c9a9fd2f02ef55a02c629fca025ebe7451efdd3ef2867d3a0af6f6"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Convert media set to table rows"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Convert media set to table rows

> Supported in: Batch

Produces a dataset containing media references and basic metadata for media items in a media set.

**Transform categories**: File, Media

## Declared arguments

* **Deduplicate by path:** Deduplicate media items by path. Only supported in snapshot mode.<br>*Literal\<Boolean>*
* **Media set:** Media set to load media references for.<br>*Media*
