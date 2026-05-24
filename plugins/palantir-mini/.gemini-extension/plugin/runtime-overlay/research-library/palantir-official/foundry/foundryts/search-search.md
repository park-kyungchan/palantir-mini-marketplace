---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/search-search/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/search-search/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1ad7dbed46b10df11fddac757b23a4725e7c9e9c8cdc7b653f72ae9819101ab7"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > search.Search"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.search.Search

## *class* foundryts.search.Search

Interface for performing search queries on timeseries using the Ontology.

This interface enables searching a collection of time series using properties in the Ontology. The search can be
refined with granular filters to determine which objects to include in the search.

This is useful for querying multiple timeseries when programmatic access to the time series is dynamic
and based property values of the ontology. Consider the example below:

Your Ontology contains a **stock** object type with properties \[`ticker`, `sector`, `exchange`, `price`].
To get the price for all stocks in the “Technology” sector, you can use [`Search.series()`](#foundryts.search.Search.series) with the
following query:

```pycon
>>> fts = FoundryTS()
>>> tech_stocks_price = fts.search.series(
...     query=(ontology("sector") == "Technology"),
...     object_types=["stock"],
...     property_type_id="price"
... )
>>> tech_stocks_price.to_pandas()
           series               timestamp   value
    0     stock-A 2023-01-01 00:00:00.000  150.75
    1     stock-A 2023-01-02 00:00:00.000  152.30
    2     stock-A 2023-01-03 00:00:00.000  148.90
    3     stock-B 2023-01-01 00:00:00.000  200.50
    4     stock-B 2023-01-02 00:00:00.000  202.75
    5     stock-B 2023-01-03 00:00:00.000  198.40
    6     stock-C 2023-01-01 00:00:00.000  120.10
    7     stock-C 2023-01-02 00:00:00.000  118.95
    8     stock-C 2023-01-03 00:00:00.000  121.70
    9     stock-D 2023-01-01 00:00:00.000  310.20
    10    stock-D 2023-01-02 00:00:00.000  312.50
    11    stock-D 2023-01-03 00:00:00.000  308.90
```

Similarly, you can search for stocks in a specific exchange or using other relevant properties of your object type.

Search methods are accessible via the `FoundryTS.search` singleton property as shown in the example above.

:::callout{theme="warning" title="Note"}
Search can only query timeseries references and not values within the timeseries themselves (for
example searching for series or points where values satisfy a predicate). For searching data within timeseries see
`dsl()` and `time_series_search()`.
:::

#### *abstract* series(query, max\_results=10000, \*\*kwargs)

Searches for timeseries using the passed query and returns a `NodeCollection` containing all
results.

The search syntax checks equality against properties in the Ontology using [`ontology()`](/docs/foundry/foundryts/search-ontology/#foundryts.search.ontology) using the `==`
operator. Additionally, you can scope the search to specific object types in the Ontology using
`object_types`. This is recommended to avoid searching over the entire Ontology.

* **Parameters:**
  * **query** (*Any*) – Search query composed of operators and operands above.
  * **max\_results** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* *optional*) – Maximum number of series definition results to return between 1 and 10,000 results (default is 10,000).
  * **\*\*kwargs** – Options and flags for additional search behavior behavior.
* **Keyword Arguments:**
  * **object\_types** (*List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Ontology objects with time series properties to search in the query (default is to search over all time series objects).
  * **property\_type\_id** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Time series property in the object to return, this is required if an object contains multiple time series
    properties (TSPs) and no default TSP is set. [↗ Default TSPs can be defined for any object with TSPs in the
    platform](/docs/foundry/time-series/time-series-properties/#default-time-series-property).
  * **experimental\_enable\_complex\_properties** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – Whether to send Time Series Properties (TSPs) to the time series backend. This is required when using
    non-primitive time dependent properties such as [↗ Templates](/docs/foundry/time-series/time-series-concepts-glossary/#codex-template)
    or for time series properties backed by multiple time series syncs (such time series are written into the
    Ontology as [↗ Qualified series ID](/docs/foundry/time-series/time-series-concepts-glossary/#qualified-series-id))
    (default is False).
* **Returns:**
  A `NodeCollection` containing all time series references that match the search query as
  `FunctionNode`.
* **Return type:**
  `NodeCollection`

:::callout{theme="warning" title="Note"}
Ensure that properties that you use in your query (with [`ontology()`](/docs/foundry/foundryts/search-ontology/#foundryts.search.ontology)) are searchable or search will
fail. Time series properties are not searchable.

The `experimental_enable_complex_properties` flag is required when using non-primitive time dependent
properties such as Templates or multi-sync properties.
:::

## Examples

```pycon
>>> fts = FoundryTS()
```

```pycon
>>> tsp_search_without_query = fts.search.series(object_types=["stock-series"])
>>> tsp_search_without_query.to_pandas()
       series               timestamp  value
0    SPX_open 1970-01-01 00:00:00.000    1.5
1    SPX_open 1970-01-01 00:00:00.001    2.5
2    SPX_open 1970-01-01 00:00:00.004    3.5
3  ZVZZT_open 1970-01-01 00:00:00.000    2.5
4  ZVZZT_open 1970-01-01 00:00:00.001    3.5
5  ZVZZT_open 1970-01-01 00:00:00.004    4.5
```

```pycon
>>> tsp_search = fts.search.series((search.ontology("ticker") == "SPX"))
>>> tsp_search.to_pandas()
      series               timestamp  value
0   SPX_open 1970-01-01 00:00:00.000    1.5
1   SPX_open 1970-01-01 00:00:00.001    2.5
2   SPX_open 1970-01-01 00:00:00.004    3.5
3  SPX_close 1970-01-01 00:00:00.005   15.0
4  SPX_close 1970-01-01 00:00:00.006   25.0
5  SPX_close 1970-01-01 00:00:00.007   35.0
```

```pycon
>>> tsp_search_with_experimental_properties = fts.search.series(
...     (search.ontology("ticker") == "SPX"),
...     object_types=["stock-series"],
...     experimental_enable_complex_properties=True,
... )
>>> tsp_search_with_experimental_properties.to_pandas()
                        series               timestamp  value
0  stock-series:SPX:open_price 1970-01-01 00:00:00.000    1.5
1  stock-series:SPX:open_price 1970-01-01 00:00:00.001    2.5
2  stock-series:SPX:open_price 1970-01-01 00:00:00.004    3.5
```
