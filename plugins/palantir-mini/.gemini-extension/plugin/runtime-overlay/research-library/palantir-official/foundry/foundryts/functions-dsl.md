---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-dsl/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-dsl/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e0083110bb8e7fa5faa70a0297adabdd585f7e6dc0234e1b26e26489b973059c"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.dsl"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.dsl

## foundryts.functions.dsl(program, return\_type=None, labels=None, before='nearest', internal='default', after='nearest')

Returns a function that applies a DSL formula to one or more input timeseries to yield a new timeseries.

The formula is applied to each timestamp in the input timeseries. The specified interpolation strategy is used for
timestamps where one of the input timeseries is missing a value. See [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) for a list of available
strategies.

A DSL formula can apply on unary, binary or n-ary operands. All operations in the DSL are composable, allowing you
to build complex expressions by combining simpler ones.

Find the [↗ full reference of the Timeseries DSL Syntax here](/docs/foundry/quiver/cards-formula-syntax/).

* **Parameters:**
  * **program** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Formula to apply to one or more input timeseries using syntax from the
    [↗ Timeseries DSL Reference docs](/docs/foundry/quiver/cards-formula-syntax/).
  * **return\_type** (*Type* *,* *optional*) – (DEPRECATED) Type to use for values of the transformed series.
  * **labels** (*List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Ordered list of labels to refer to each input timeseries in the formula (default is
    \[‘a’, ‘b’, …, ‘aa’, ‘ab’, …])
  * **before** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points before the first in the series, which can be a list per series,
    use a valid strategy from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `NEAREST`).
  * **internal** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points between existing points, which can be a list per series,
    use a valid strategy from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `LINEAR` for numeric and `PREVIOUS` for
    enum timeseries).
  * **after** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points after the first in the series, which can be a list per series,
    use a valid strategy from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `NEAREST`).
* **Returns:**
  A function that takes one or more timeseries and applies the formula on the input timeseries to return a single
  updated timeseries.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> FunctionNode

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate), [`udf()`](/docs/foundry/foundryts/functions-udf/#foundryts.functions.udf)
:::

## Examples

```pycon
>>> series_1 = F.points(
...     (10, 6.0),
...     (20, 11.0),
...     (30, 24.0),
...     (40, float("inf")),
...     (50, 45.0),
...     (60, 96.0),
...     name="series-1",
... )
>>> series_2 = F.points(
...     (10, 8.0),
...     (20, 12.0),
...     (30, 24.0),
...     (40, 48.0),
...     (50, float("NaN")),
...     (60, 196.0),
...     name="series-2",
... )
>>> series_1.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010    6.0
1 1970-01-01 00:00:00.000000020   11.0
2 1970-01-01 00:00:00.000000030   24.0
3 1970-01-01 00:00:00.000000040    inf
4 1970-01-01 00:00:00.000000050   45.0
5 1970-01-01 00:00:00.000000060   96.0
>>> series_2.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010    8.0
1 1970-01-01 00:00:00.000000020   12.0
2 1970-01-01 00:00:00.000000030   24.0
3 1970-01-01 00:00:00.000000040   48.0
4 1970-01-01 00:00:00.000000050    NaN
5 1970-01-01 00:00:00.000000060  196.0
```

```pycon
>>> sum_formula = "a+b"
>>> sum_series = F.dsl(sum_formula)([series_1, series_2])
>>> sum_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010   14.0
1 1970-01-01 00:00:00.000000020   23.0
2 1970-01-01 00:00:00.000000030   48.0
3 1970-01-01 00:00:00.000000040    inf
4 1970-01-01 00:00:00.000000050    NaN
5 1970-01-01 00:00:00.000000060  292.0
```

```pycon
>>> even_only_formula = "a % 2 == 0 ? a : skip"
>>> even_series_1 = F.dsl(even_only_formula)(series_1)
>>> even_series_1.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010    6.0
1 1970-01-01 00:00:00.000000030   24.0
2 1970-01-01 00:00:00.000000060   96.0
```

```pycon
>>> argmin_formula = "argmin(a,b)"
>>> argmin_series = F.dsl(argmin_formula)([series_1, series_2])
>>> argmin_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010    0.0
1 1970-01-01 00:00:00.000000020    0.0
2 1970-01-01 00:00:00.000000030    0.0
3 1970-01-01 00:00:00.000000040    1.0 # inf is greater than 48
4 1970-01-01 00:00:00.000000050    0.0
5 1970-01-01 00:00:00.000000060    0.0
```

```pycon
>>> pow_formula = "pow(a, 2)"
>>> pow2_series = F.dsl(pow_formula)([series_1])
>>> pow2_series.to_pandas()
                      timestamp   value
0 1970-01-01 00:00:00.000000010    36.0
1 1970-01-01 00:00:00.000000020   121.0
2 1970-01-01 00:00:00.000000030   576.0
3 1970-01-01 00:00:00.000000040     inf
4 1970-01-01 00:00:00.000000050  2025.0
5 1970-01-01 00:00:00.000000060  9216.0
```

```pycon
>>> non_nan_formula = "isnan(b) ? a : b"
>>> non_nan_series = F.dsl(non_nan_formula)([series_1, series_2])
>>> non_nan_series.to_pandas()
                    timestamp  value
0 1970-01-01 00:00:00.000000010    8.0
1 1970-01-01 00:00:00.000000020   12.0
2 1970-01-01 00:00:00.000000030   24.0
3 1970-01-01 00:00:00.000000040   48.0
4 1970-01-01 00:00:00.000000050   45.0 # only value from series-1
5 1970-01-01 00:00:00.000000060  196.0
```

```pycon
>>> non_inf_formula = "isfinite(a) ? a : b"
>>> non_inf_series = F.dsl(non_inf_formula)([series_1, series_2])
>>> non_inf_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010    6.0
1 1970-01-01 00:00:00.000000020   11.0
2 1970-01-01 00:00:00.000000030   24.0
3 1970-01-01 00:00:00.000000040   48.0 # only value from series-2
4 1970-01-01 00:00:00.000000050   45.0
5 1970-01-01 00:00:00.000000060   96.0
```

```pycon
>>> assignment_formula = '''
... var doubled_shifted = a * 2; // all values are doubled
... doubled_shifted += 10; // add 10 to all doubled values
... doubled_shifted - b // difference between double_shifted and b
... '''
>>> var_assigned_series = F.dsl(assignment_formula)([series_1, series_2])
>>> var_assigned_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010   14.0
1 1970-01-01 00:00:00.000000020   20.0
2 1970-01-01 00:00:00.000000030   34.0
3 1970-01-01 00:00:00.000000040    inf
4 1970-01-01 00:00:00.000000050    NaN
5 1970-01-01 00:00:00.000000060    6.0
```
