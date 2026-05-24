---
source: https://www.palantir.com/docs/foundry/foundryts/functions-exponential-regression/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.exponential_regression
---

# foundryts.functions.exponential_regression

```python
foundryts.functions.exponential_regression(include_multiple=True, time_unit='ns', start=None, end=None)
```

Returns a function that performs exponential regression on a single time series. Finds the best-fit exponential curve expressed as `y = Ae^(Bx)`, where `A` is the initial value and `B` is the growth rate. Useful for data exhibiting exponential growth or decay patterns.

**Parameters:**
- `include_multiple` (bool, optional) — whether to include multiple regressions (default: `True`)
- `time_unit` (str, optional) — time unit for coefficients; one of `"s"`, `"ms"`, `"us"`, `"ns"` (default: `"ns"`)
- `start` (str | int | datetime, optional) — inclusive start of time range for regression
- `end` (str | int | datetime, optional) — exclusive end of time range for regression

**Returns:** `(FunctionNode) -> SummarizerNode`

**Note:** Only applicable to numeric series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| max_bounds.first_value | float | Maximum bound for A in `y=Ae^(Bx)` |
| max_bounds.second_value | float | Maximum bound for B in `y=Ae^(Bx)` |
| min_bounds.first_value | float | Minimum bound for A in `y=Ae^(Bx)` |
| min_bounds.second_value | float | Minimum bound for B in `y=Ae^(Bx)` |
| regression_fit_function.exponential_regression_fit.aparameter | float | Estimated A (initial value) |
| regression_fit_function.exponential_regression_fit.bparameter | float | Estimated B (growth rate) |

## Example

```python
>>> series = F.points(
...     (10, 6.0), (20, 12.0), (30, 24.0), (40, 48.0), (50, 96.0), name="series"
... )
>>> F.exponential_regression()(series).to_pandas()
# A=3.0, B=0.069315 (doubling every ~10 ns)
```

**See also:** `linear_regression()`, `polynomial_regression()`
