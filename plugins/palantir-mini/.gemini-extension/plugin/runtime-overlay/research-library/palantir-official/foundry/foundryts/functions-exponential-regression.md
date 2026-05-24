---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-exponential-regression/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-exponential-regression/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "072d0df42c0f72fe31fcf24865a6eeb086028e63fb63313f34ce48d3f4824558"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.exponential_regression"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.exponential\_regression

## foundryts.functions.exponential\_regression(include\_multiple=True, time\_unit='ns', start=None, end=None)

Returns a function that performs exponential regression on a single time series.

Exponential regression finds the parameters of the best-fit exponential curve over points of the input time series.
The regression is expressed as `y = Ae^(Bx)`, where `A` is the initial value and `B` is the growth rate.
The returned function will provide the parameters `A` and `B`.

Exponential regression is particularly useful when the data exhibits exponential growth or decay patterns.

* **Parameters:**
  * **include\_multiple** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – Whether to include multiple regressions (default is True).
  * **time\_unit** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The time unit of the coefficients, must be one of “s”, “ms”, “us”, “ns” (default is “ns”).
  * **start** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – Starting point (inclusive) of the time series for computing the exponential regression.
  * **end** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – End point (exclusive) of the time series for computing the exponential regression.
* **Returns:**
  A function that accepts a single time series and provides parameters for the best-fit exponential curve for the
  time series.
* **Return type:**
  (`FunctionNode`) -> `SummarizerNode`

## Dataframe schema

| Column name                                                             | Type   | Description                                                                                   |
|-------------------------------------------------------------------------|--------|-----------------------------------------------------------------------------------------------|
| max\_bounds.first\_value                                                  | float  | Maximum value of the initial value (A) in `y=Ae^(Bx)`.                                        |
| max\_bounds.second\_value                                                 | float  | Maximum value of the growth rate (B) in `y=Ae^(Bx)`.                                          |
| min\_bounds.first\_value                                                  | float  | Minimum value of the initial value (A) in `y=Ae^(Bx)`.                                        |
| min\_bounds.second\_value                                                 | float  | Minimum value of the growth rate (B) in `y=Ae^(Bx)`.                                          |
| regression\_fit\_function.<br/>exponential\_regression\_fit.<br/>aparameter | float  | Estimated parameter ‘A’ (initial value) of the<br/>exponential regression fit in `y=Ae^(Bx)`. |
| regression\_fit\_function.<br/>exponential\_regression\_fit.<br/>bparameter | float  | Estimated parameter ‘B’ (growth rate) of the<br/>exponential regression fit in `y=Ae^(Bx)`.   |

:::callout{theme="success" title="See Also"}
[`linear_regression()`](/docs/foundry/foundryts/functions-linear-regression/#foundryts.functions.linear_regression), [`polynomial_regression()`](/docs/foundry/foundryts/functions-polynomial-regression/#foundryts.functions.polynomial_regression)
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
>>> exponential_regr = F.exponential_regression()(series)
>>> exponential_regr.to_pandas()
   max_bounds.first_value  max_bounds.second_value  min_bounds.first_value  min_bounds.second_value  regression_fit_function.exponential_regression_fit.aparameter  regression_fit_function.exponential_regression_fit.bparameter
0                    50.0                     96.0                    10.0                      6.0                                                3.0                                                       0.069315
```
