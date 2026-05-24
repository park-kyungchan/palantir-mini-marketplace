---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-udf/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-udf/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4db1de30475a635341d5c89c5c70f16a9c30ad0fb55ca4059c6e3b295809edab"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.udf"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.udf

## foundryts.functions.udf(func, columns=None, types=None)

Returns a function that will call a user-defined function on the dataframe result of queries.

User defined functions (UDF) are a special time series feature that allow running custom Python code on the result
of queries returning dataframes. The UDF is applied to the final dataframe in the result of all queries.

* **Parameters:**
  * **func** (Callable\[\[[`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)], Any]) – User defined function to apply.
  * **columns** (*List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – List of column names for the resulting dataframe when `func` returns [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)
    (default is the original column names in the input dataframe).
  * **types** (*List* \*\[\**Any* *]* *,* *optional*) – List of column types for the resulting dataframe when `func` returns [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)
    (default is the original column types in the input dataframe).
* **Returns:**
  The result of applying the UDF on the input \:py:class\`pandas.DataFrame\`.
* **Return type:**
  Any

:::callout{theme="success" title="See Also"}
[`dsl()`](/docs/foundry/foundryts/functions-dsl/#foundryts.functions.dsl)
:::

## Examples

```pycon
>>> series = F.points((0, 0.0), (100, 100.0), (140, 140.0), (200, 200.0), name="series")
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000000    0.0
1 1970-01-01 00:00:00.000000100  100.0
2 1970-01-01 00:00:00.000000140  140.0
3 1970-01-01 00:00:00.000000200  200.0
```

```pycon
>>> def double(df: pandas.DataFrame) -> pandas.DataFrame:
...     df["value"] *= 2
...     return df
>>> doubled_series = F.udf(double, ["timestamp", "value"], [int, float])(series)
>>> doubled_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000000    0.0
1 1970-01-01 00:00:00.000000100  200.0
2 1970-01-01 00:00:00.000000140  280.0
3 1970-01-01 00:00:00.000000200  400.0
```
