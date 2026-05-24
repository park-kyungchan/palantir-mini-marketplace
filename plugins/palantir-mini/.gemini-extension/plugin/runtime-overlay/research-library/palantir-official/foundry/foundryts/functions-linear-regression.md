---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-linear-regression/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-linear-regression/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7e03d5a3d4238c5d3b46ab6755952568b4f9ec86121b180b5f56c482e43c80db"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.linear_regression"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.linear\_regression

## foundryts.functions.linear\_regression(include\_intercept=True, time\_unit='ns', start=None, end=None)

Returns a function that performs linear regression on a single time series.

Linear regression finds the parameters of the best-fit line over points of the input time series.
Linear regression is expressed as `y = Ax + B`, where `A` is the slope of the line and `B` is the
y-intercept. The returned function will provide the parameters `A` and `B`.

Linear regression is useful when you need to identify and quantify a linear trend in your time series data.

* **Parameters:**
  * **time\_unit** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The time unit of the coefficients, must be one of “s”, “ms”, “us”, “ns” (default is “ns”).
  * **start** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – Starting point (inclusive) of the time series for computing the linear regression.
  * **end** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – End point (exclusive) of the time series for computing the linear regression.
* **Returns:**
  A function that accepts a single time series and returns parameters for the best-fit line for the points in
  the time series using linear regression.
* **Return type:**
  (`FunctionNode`) -> `SummarizerNode`

## Dataframe schema

| Column name                                                                 | Type   | Description                                                                  |
|-----------------------------------------------------------------------------|--------|------------------------------------------------------------------------------|
| max\_bounds.first\_value                                                      | float  | Maximum value of the slope (A) in `y=Ax+B`.                                  |
| max\_bounds.second\_value                                                     | float  | Maximum value of the intercept (B) in `y=Ax+B`.                              |
| min\_bounds.first\_value                                                      | float  | Minimum value of the slope (A) in `y=Ax+B`.                                  |
| min\_bounds.second\_value                                                     | float  | Minimum value of the intercept (B) in `y=Ax+B`.                              |
| regression\_fit\_function.<br/>linear\_regression\_fit.<br/>slope               | float  | Parameter ‘A’ (slope) of the linear regression fit in<br/>`y=Ax+B`.          |
| regression\_fit\_function.<br/>linear\_regression\_fit.<br/>intercept           | float  | Parameter ‘B’ (intercept) of the linear regression fit in<br/>`y=Ax+B`.      |
| regression\_fit\_function.<br/>linear\_regression\_fit.<br/>statistics.rsquared | float  | R-squared value indicating the goodness of fit of the<br/>linear regression. |

:::callout{theme="success" title="See Also"}
[`exponential_regression()`](/docs/foundry/foundryts/functions-exponential-regression/#foundryts.functions.exponential_regression), [`polynomial_regression()`](/docs/foundry/foundryts/functions-polynomial-regression/#foundryts.functions.polynomial_regression)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series = F.points(
...     (10, 6.0), (20, 12.0), (30, 24.0), (40, 48.0), (50, 96.0), name="series"
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000010    6.0
1 1970-01-01 00:00:00.000000020   12.0
2 1970-01-01 00:00:00.000000030   24.0
3 1970-01-01 00:00:00.000000040   48.0
4 1970-01-01 00:00:00.000000050   96.0
```

```pycon
>>> lin_regr = F.linear_regression()(series)
>>> lin_regr.to_pandas()
   max_bounds.first_value  max_bounds.second_value  min_bounds.first_value  min_bounds.second_value  regression_fit_function.linear_regression_fit.intercept  regression_fit_function.linear_regression_fit.slope  regression_fit_function.linear_regression_fit.statistics.rsquared
0                    50.0                     96.0                    10.0                      6.0                                              -27.6                                                     2.16                                             0.870968
```
