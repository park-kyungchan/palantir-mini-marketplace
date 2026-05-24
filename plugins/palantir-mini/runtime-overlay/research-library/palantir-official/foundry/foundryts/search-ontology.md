---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/search-ontology/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/search-ontology/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fffb819d67b9052baf13c330df08cf2f6618f3394fccc8a3b959fedcbfcad2a7"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > search.ontology"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.search.ontology

## foundryts.search.ontology(name, should\_normalize=False, force\_analyze=False)

Creates an Ontology property reference for search.

Use this for creating an Ontology property that you can compare values to in [`Search.series()`](/docs/foundry/foundryts/search-search/#abstract-seriesquery-maxresults10000-kwargs).

* **Parameters:**
  * **name** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Name of the Ontology property as it appears in the Ontology.
  * **should\_normalize** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* *optional* \*(\**default is False* *)*) – Whether to normalize the name of the Ontology property.
  * **force\_analyze** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – (DEPRECATED) Whether to reference raw properties. (default is False).
* **Returns:**
  The Ontology property reference that can be used in [`Search.series`](/docs/foundry/foundryts/search-search/).
* **Return type:**
  [`Property`](/docs/foundry/foundryts/search-property/#foundryts.search.Property)

:::callout{theme="success" title="See Also"}
[`Search.series()`](/docs/foundry/foundryts/search-search/#abstract-seriesquery-maxresults10000-kwargs)
:::

## Examples

```pycon
>>> from foundryts.search import ontology
>>> ontology('some-property-name')
Property['some-property-name']
>>> fts.search.series(ontology('my_prop') == 'my_value')
NodeCollection([...](1000))
```
