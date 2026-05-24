---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-skip-nonfinite/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-skip-nonfinite/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f163e96ebd40d82a9a2cca0a03e9d345737c7137f10555fd1dcc9600f888db39"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.skip_nonfinite"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.skip\_nonfinite

## foundryts.functions.skip\_nonfinite()

Returns a function that filters all points with non-finite values in a time series.

Non-finite values can be `inf` or `NaN`.

* **Returns:**
  A function that accepts a single time series and returns the filtered time series with only finite point values.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description            |
|---------------|------------------|------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point |
| value         | float            | Value of the point     |

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

:::callout{theme="success" title="See Also"}
[`where()`](/docs/foundry/foundryts/functions-where/#foundryts.functions.where)
:::

## Examples

```pycon
>>> series = F.points(
...     (100, 100.0),
...     (120, float("nan")),
...     (130, 230.0),
...     (166, float("inf")),
...     (167, 366.0),
...     (168, float("-inf")),
...     name="series",
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000100  100.0
1 1970-01-01 00:00:00.000000120    NaN
2 1970-01-01 00:00:00.000000130  230.0
3 1970-01-01 00:00:00.000000166    inf
4 1970-01-01 00:00:00.000000167  366.0
5 1970-01-01 00:00:00.000000168   -inf
```

```pycon
>>> finite_series = F.skip_nonfinite()(series)
>>> finite_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000100  100.0
1 1970-01-01 00:00:00.000000130  230.0
2 1970-01-01 00:00:00.000000167  366.0
```
