---
source: https://www.palantir.com/docs/foundry/foundryts/functions-linear-regression/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.linear_regression
---

# foundryts.functions.linear_regression

```python
foundryts.functions.linear_regression(include_intercept=True, time_unit='ns', start=None, end=None)
```

Returns a function that performs linear regression on a single time series. Finds the best-fit line expressed as `y = Ax + B`, where `A` is the slope and `B` is the y-intercept. Useful for identifying and quantifying linear trends.

**Parameters:**
- `include_intercept` (bool, optional) — whether to include intercept (default: `True`)
- `time_unit` (str, optional) — time unit for coefficients; one of `"s"`, `"ms"`, `"us"`, `"ns"` (default: `"ns"`)
- `start` (str | int | datetime, optional) — inclusive start of time range for regression
- `end` (str | int | datetime, optional) — exclusive end of time range for regression

**Returns:** `(FunctionNode) -> SummarizerNode`

**Note:** Only applicable to numeric series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| max_bounds.first_value | float | Maximum bound for slope A |
| max_bounds.second_value | float | Maximum bound for intercept B |
| min_bounds.first_value | float | Minimum bound for slope A |
| min_bounds.second_value | float | Minimum bound for intercept B |
| regression_fit_function.linear_regression_fit.slope | float | Estimated slope A |
| regression_fit_function.linear_regression_fit.intercept | float | Estimated intercept B |
| regression_fit_function.linear_regression_fit.statistics.rsquared | float | R-squared goodness-of-fit |

## Example

```python
>>> series = F.points(
...     (10, 6.0), (20, 12.0), (30, 24.0), (40, 48.0), (50, 96.0), name="series"
... )
>>> F.linear_regression()(series).to_pandas()
# slope=2.16, intercept=-27.6, r_squared=0.870968
```

**See also:** `exponential_regression()`, `polynomial_regression()`
