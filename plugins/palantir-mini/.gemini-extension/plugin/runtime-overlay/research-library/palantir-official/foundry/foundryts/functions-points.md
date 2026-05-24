---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-points/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-points/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e36fab3c146063b47256f4b8e096341617470b4d80f23d210a151e87e3455a80"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.points"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.points

## foundryts.functions.points(\*list\_of\_points, name='point-set')

Creates a set of user-defined points that act as a time series and are not written by a sync.

This is useful for creating a reference time series for operations like interpolation or DSL formulas.
This is also a helpful utility for getting familiar with FoundryTS without setting up a test time series.

* **Parameters:**
  * **\*list\_of\_points** (*Tuple* \*\[\**TimestampType* *,* [*float*](https://docs.python.org/3/library/functions.html#float) *]*  *|* *Tuple* \*\[\**TimestampType* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]*) – Tuples of timestamp and the point value at that timestamp as a non-keyword position arg.
  * **name** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Alias for the point set which will be used as the time series ID for all downstream operations.
* **Returns:**
  A point-set which acts like a time series for all downstream operations.
* **Return type:**
  [FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`series()`](/docs/foundry/foundryts/functions-series/#foundryts.functions.series)
:::

:::callout{theme="warning" title="Note"}
All point values should have the same type.
:::

## Examples

```pycon
>>> numeric_series = F.points(
...     (0, 0.0), (100, 100.0), (140, 140.0), (200, 200.0), name="numeric"
... )
>>> numeric_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000000    0.0
1 1970-01-01 00:00:00.000000100  100.0
2 1970-01-01 00:00:00.000000140  140.0
3 1970-01-01 00:00:00.000000200  200.0
```

```pycon
>>> enum_series = F.points(
...     (100, "ON"),
...     (120, "ON"),
...     (130, "OFF"),
...     (150, "ON"),
...     (160, "OFF"),
...     name="enum",
... )
>>> enum_series.to_pandas()
                      timestamp value
0 1970-01-01 00:00:00.000000100    ON
1 1970-01-01 00:00:00.000000120    ON
2 1970-01-01 00:00:00.000000130   OFF
3 1970-01-01 00:00:00.000000150    ON
4 1970-01-01 00:00:00.000000160   OFF
```
