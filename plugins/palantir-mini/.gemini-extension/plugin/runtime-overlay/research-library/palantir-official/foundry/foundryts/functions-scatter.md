---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-scatter/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-scatter/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "10dc9fffc08703973e5dcab987b58e0c5eca3f08131f4afcd598d1008dfd57b1"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.scatter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.scatter

## foundryts.functions.scatter(start=None, end=None, before='NONE', internal='LINEAR', after='NONE', regression=None, regression\_fit=None)

Returns a function that will generate the list of aligned (x,y) points for exactly two time series.

A scatter plot consists of (x,y) coordinates. For two given time series, an (x,y) coordinate
will consist of a point from each series where the timestamps match. For points where the underlying series
timestamps do not match, the configured interpolation strategy will be used for the series missing a point at that
timestamp.

Read about supported interpolation strategies for internal, before and after in [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate)

Additionally, you can pass a regression function to find the best fit line across the points in the graph.

* **Parameters:**
  * **start** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Timestamp (inclusive) to start aligning points (default is pandas.Timestamp.min)
  * **end** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Timestamp (exclusive) to finish aligning points (default is pandas.Timestamp.max)
  * **before** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Name of the interpolation strategy to use for aligning the first point, use interpolation available strategies
    from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `NONE`)
  * **internal** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Name of the interpolation strategy to use for aligning all points within the series, use interpolation
    available strategies from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `LINEAR`)
  * **after** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Name of the interpolation strategy to use for aligning the last point, use interpolation available strategies
    from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `NONE`)
  * **regression** ([`linear_regression()`](/docs/foundry/foundryts/functions-linear-regression/#foundryts.functions.linear_regression) | [`polynomial_regression()`](/docs/foundry/foundryts/functions-polynomial-regression/#foundryts.functions.polynomial_regression) | [`exponential_regression()`](/docs/foundry/foundryts/functions-exponential-regression/#foundryts.functions.exponential_regression), optional) – Output of one of the regression functions, this will provide points for the best fit line (as well as other
    related metrics) line between the two input series (defaults to no regression).
* **Returns:**
  Returns a function that accepts exactly two series as input, and returns the aligned points for the scatterplot.
  Each row in the resulting dataframe represents an aligned point.
* **Return type:**
  ([NodeCollection](/docs/foundry/foundryts/node-collection/#foundryts.NodeCollection)) -> SummarizerNode

## Dataframe schema

| Column name         | Type     | Description                                                                                         |
|---------------------|----------|-----------------------------------------------------------------------------------------------------|
| is\_truncated        | bool     | This field is deprecated and should be ignored.<br/>If the output was truncated for a large series. |
| points.first\_value  | float    | Value of the point in the first series.                                                             |
| points.second\_value | float    | Value of point in the second series.                                                                |
| points.timestamp    | datetime | Timestamp of the points.                                                                            |
| regression.\*       | float    | Columns from the regression function (if<br/>regression is used).                                   |

:::callout{theme="success" title="See Also"}
[`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate), [`linear_regression()`](/docs/foundry/foundryts/functions-linear-regression/#foundryts.functions.linear_regression), [`polynomial_regression()`](/docs/foundry/foundryts/functions-polynomial-regression/#foundryts.functions.polynomial_regression), [`exponential_regression()`](/docs/foundry/foundryts/functions-exponential-regression/#foundryts.functions.exponential_regression)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series_1 = F.points((11, 21.0), (13, 23.0), (15, 25.0), (17, 27.0), name="series-1")
>>> series_2 = F.points((11, 21.0), (13, 23.0), (17, 37.0), (37, 47.0), name="series-2")
>>> series_1.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000011   21.0
1 1970-01-01 00:00:00.000000013   23.0
2 1970-01-01 00:00:00.000000015   25.0
3 1970-01-01 00:00:00.000000017   27.0
>>> series_2.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000011   21.0
1 1970-01-01 00:00:00.000000013   23.0
2 1970-01-01 00:00:00.000000017   37.0
3 1970-01-01 00:00:00.000000037   47.0
>>> nc = NodeCollection([series_1, series_2])
```

```pycon
>>> scatter_plot = F.scatter( # scatter plot with interpolation
...     before="NEAREST",
...     internal="LINEAR",
...     after="NEAREST",
... )(nc)
>>> scatter_plot.to_pandas()
    is_truncated  points.first_value  points.second_value              points.timestamp
    0         False                21.0                 21.0 1970-01-01 00:00:00.000000011
    1         False                23.0                 23.0 1970-01-01 00:00:00.000000013
    2         False                25.0                 30.0 1970-01-01 00:00:00.000000015
    3         False                27.0                 37.0 1970-01-01 00:00:00.000000017
    4         False                27.0                 47.0 1970-01-01 00:00:00.000000037
```

```pycon
>>> lin_regression_scatter_plot = F.scatter(
...     before="NEAREST",
...     internal="LINEAR",
...     after="NEAREST",
...     regression=F.linear_regression(),
... )(nc)
>>> lin_regression_scatter_plot.to_pandas()
   is_truncated  points.first_value  points.second_value              points.timestamp  regression.max_bounds.first_value  regression.max_bounds.second_value  regression.min_bounds.first_value  regression.min_bounds.second_value  regression.regression_fit_function.linear_regression_fit.intercept  regression.regression_fit_function.linear_regression_fit.slope  regression.regression_fit_function.linear_regression_fit.statistics.rsquared
0         False                21.0                 21.0 1970-01-01 00:00:00.000000011                               27.0                                47.0                               21.0                                21.0                                         -59.926471                                                            3.720588                                                        0.827161
1         False                23.0                 23.0 1970-01-01 00:00:00.000000013                               27.0                                47.0                               21.0                                21.0                                         -59.926471                                                            3.720588                                                        0.827161
2         False                25.0                 30.0 1970-01-01 00:00:00.000000015                               27.0                                47.0                               21.0                                21.0                                         -59.926471                                                            3.720588                                                        0.827161
3         False                27.0                 37.0 1970-01-01 00:00:00.000000017                               27.0                                47.0                               21.0                                21.0                                         -59.926471                                                            3.720588                                                        0.827161
4         False                27.0                 47.0 1970-01-01 00:00:00.000000037                               27.0                                47.0                               21.0                                21.0                                         -59.926471                                                            3.720588                                                        0.827161
```
