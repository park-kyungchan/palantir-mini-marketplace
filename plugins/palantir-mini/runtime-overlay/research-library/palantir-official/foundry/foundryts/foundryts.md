---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/foundryts/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/foundryts/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7797ca2d4e9d767596434f9aa171d49db5c1bd363b8afaa6aa1adb4792847732"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > FoundryTS"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.FoundryTS

## *class* foundryts.FoundryTS(\*args, \*\*kwargs)

The singleton that sends queries to the FoundryTS backend under the hood.

This singleton is automatically initialized using environment variables and the user is not required to initialize
an instance for calling FoundryTS supported functions.

## Examples

```pycon
>>> fts = FoundryTS()
```

#### *property* search

Property for searching the Ontology with [`foundryts.search.Search`](/docs/foundry/foundryts/search-search/).

We recommend using this property to perform search as it enforces safeguards for the searching in
the Foundry ecosystem.

## Examples

```pycon
>>> fts = FoundryTS()
>>> objects = fts.search.series(metadata.property == 'value')
NodeCollection(...)
```
