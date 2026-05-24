---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-polynomial-regression/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-polynomial-regression/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c8ee9032c8e8be4765dd35e54ef9e25a2108d59994e0297977147412b6e153bf"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.polynomial_regression"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.polynomial\_regression

## foundryts.functions.polynomial\_regression(max\_degree=0, time\_unit='ns', start=None, end=None)

Returns a function that computes the polynomial regression for a single time series.

Polynomial regression finds parameters of the best-fit polynomial curve of a specified degree over the points of
the input time series. The polynomial is expressed as `y = a0 + a1*x + a2*x^2 + ... + an*x^n`, where the
coefficients `a0, a1, ..., an` are determined by the regression.

Polynomial regression is useful when the relationship between the variables is more complex than a simple linear
relationship.

* **Parameters:**
  * **max\_degree** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* *optional*) – The maximum degree of the polynomial to fit (default is 0). For example, a degree of 2 fits a quadratic
    polynomial.
  * **time\_unit** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The time unit of the coefficients, must be one of “s”, “ms”, “us”, “ns” (default is “ns”).
  * **start** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – Starting point (inclusive) of the time series for computing the polynomial regression.
  * **end** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – End point (exclusive) of the time series for computing the polynomial regression.
* **Returns:**
  A function that accepts a single time series and returns parameters for the best-fit polynomial curve for the
  points in the time series using polynomial regression.
* **Return type:**
  (`FunctionNode`) -> `SummarizerNode`

## Dataframe schema

| Column name                                                                          | Type   | Description                                                     |
|--------------------------------------------------------------------------------------|--------|-----------------------------------------------------------------|
| max\_bounds.first\_value                                                               | float  | Maximum value of the first coefficient (a0).                    |
| max\_bounds.second\_value                                                              | float  | Maximum value of the second coefficient (a1).                   |
| min\_bounds.first\_value                                                               | float  | Minimum value of the first coefficient (a0).                    |
| min\_bounds.second\_value                                                              | float  | Minimum value of the second coefficient (a1).                   |
| regression\_fit\_function.<br/>polynomial\_regression\_fit.<br/>coefficients.coefficient | float  | Coefficient value of the polynomial<br/>regression fit.         |
| regression\_fit\_function.<br/>polynomial\_regression\_fit.<br/>coefficients.degree      | int    | Degree of the polynomial corresponding to<br/>each coefficient. |

:::callout{theme="success" title="See Also"}
[`exponential_regression()`](/docs/foundry/foundryts/functions-exponential-regression/#foundryts.functions.exponential_regression), [`linear_regression()`](/docs/foundry/foundryts/functions-linear-regression/#foundryts.functions.linear_regression)
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
>>> poly_regr = F.polynomial_regression(3)(series)
>>> poly_regr.to_pandas()
   max_bounds.first_value  max_bounds.second_value  min_bounds.first_value  min_bounds.second_value  regression_fit_function.polynomial_regression_fit.coefficients.coefficient  regression_fit_function.polynomial_regression_fit.coefficients.degree
0                    50.0                     96.0                    10.0                      6.0                                          -4.800000                                                                           0
1                    50.0                     96.0                    10.0                      6.0                                           1.585714                                                                           1
2                    50.0                     96.0                    10.0                      6.0                                          -0.066429                                                                           2
3                    50.0                     96.0                    10.0                      6.0                                           0.001500                                                                           3
```
