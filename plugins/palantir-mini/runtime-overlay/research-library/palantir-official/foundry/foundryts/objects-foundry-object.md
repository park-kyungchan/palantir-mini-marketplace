---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/objects-foundry-object/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/objects-foundry-object/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "067f1f1d5fcf1288ff42bbdb5c2c91f050a61af797ebf98582f69a244475d3e8"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > objects.FoundryObject"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.objects.FoundryObject

## *class* foundryts.objects.FoundryObject(object\_type\_id, object\_primary\_key)

An object in the Ontology.

* **Parameters:**
  * **object\_type\_id** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – ID of the object type in the Ontology.
  * **object\_primary\_key** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – The primary key of the object which can be found either in the dataset defining the object or in the
    [↗ Object Explorer](/docs/foundry/object-explorer/search-objects/).

:::callout{theme="warning" title="Note"}
A [`FoundryObject`](#foundryts.objects.FoundryObject) should only be created using [`Object.id()`](/docs/foundry/foundryts/objects-object/#foundryts.objects.Object.id) which provides safeguards for
accessing objects in the Ontology. Refer to examples below.
:::

## Examples

```pycon
>>> aircraft_object = Object("aircraft").id("aircraft-1l)
```

#### property(property\_id, dataframe\_identifier=None)

Creates a time series reference using the Time Series Property of the [`FoundryObject`](#foundryts.objects.FoundryObject).

This reference can be used for all transformations and analysis supported by FoundryTS.

* **Parameters:**
  * **property\_id** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – The property ID used to reference a Time Series Property which can be extracted from the
    [↗ Property editor view in the Ontology Manager](/docs/foundry/ontology-manager/overview/#property-editor-view).
  * **dataframe\_identifier** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The series identifier in the resulting dataframe when multiple time series are evaluated in a
    [`foundryts.NodeCollection`](/docs/foundry/foundryts/node-collection/#foundryts.NodeCollection). This is required for accessing complex Time Series Property
    types such as  [↗ Templates](/docs/foundry/time-series/time-series-concepts-glossary/#codex-template)
    (default is the series ID in the platform).
* **Returns:**
  A time series reference as a `FunctionNode` that can be used for transformations and analysis.
* **Return type:**
  `FunctionNode`

:::callout{theme="warning" title="Note"}
Ensure you’re using the Property ID for `property_id` since there are three property references available on
the platform: `property ID`, `property RID`, `API Name`.
:::

## Examples

```pycon
>>> aircraft_1_altimeter_reading = (
...     Object("aircraft")
...     .id("aircraft-1")
...     .property("altimeter_series_id")
... )
>>> aircraft_1_altimeter_reading.to_pandas()
                timestamp     value
0   2024-09-06 07:00:00.000 -1.185493
1   2024-09-06 07:01:30.983  0.830117
2   2024-09-06 07:03:01.966  0.115240
3   2024-09-06 07:04:32.949  0.059973
4   2024-09-06 07:06:03.932 -0.290032
..                      ...       ...
245 2024-09-06 13:11:30.835  2.346732
246 2024-09-06 13:13:01.818  0.891372
247 2024-09-06 13:14:32.801  0.318806
248 2024-09-06 13:16:03.784 -0.339124
249 2024-09-06 13:17:34.767 -0.879413
```
