---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/search-property/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/search-property/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "22604afc9707d75cf8b62d5d4bbec25e849ae32f5a06af28143cb2ea8833fbef"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > search.Property"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.search.Property

## *class* foundryts.search.Property(name, property\_type, field, should\_normalize=False, force\_analyze=False)

A FoundryTS wrapper for an Ontology object property.

This class is used internally for evaluating [`Search`](/docs/foundry/foundryts/search-search/) queries. As a result of
[`ontology()`](/docs/foundry/foundryts/search-ontology/#foundryts.search.ontology), instances of [`Property`](#foundryts.search.Property) will be evaluated for [`Search`](/docs/foundry/foundryts/search-search/) expressions.

* **Parameters:**
  * **name** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Name of the Ontology object property.
  * **property\_type** ([*type*](https://docs.python.org/3/library/functions.html#type)) – The type of values in the property as a Python time. Review corresponding supported types in the
    [↗ Platform documentation](/docs/foundry/object-link-types/properties-overview/#supported-property-types).
  * **should\_normalize** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – Whether to normalize the name of the Ontology property. (default is False).
  * **force\_analyze** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – (DEPRECATED) Whether to reference raw properties. (default is False).
