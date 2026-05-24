---
source: https://www.palantir.com/docs/foundry/foundryts/functions-dsl/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.dsl
---

# foundryts.functions.dsl

```python
foundryts.functions.dsl(program, return_type=None, labels=None, before='nearest', internal='default', after='nearest')
```

Returns a function that applies a DSL formula to one or more input time series to yield a new time series. The formula is applied at each timestamp; interpolation handles missing values.

**Parameters:**
- `program` (str) — formula using [Timeseries DSL syntax](https://www.palantir.com/docs/foundry/quiver/cards-formula-syntax/)
- `return_type` — (deprecated) value type for the output series
- `labels` — ordered labels for input series in the formula (default: `['a', 'b', ..., 'aa', ...]`)
- `before` — interpolation strategy before first point (default: `NEAREST`)
- `internal` — interpolation strategy between points (default: `LINEAR` for numeric, `PREVIOUS` for enum)
- `after` — interpolation strategy after last point (default: `NEAREST`)

**Returns:** `(FunctionNode) -> FunctionNode`

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Point timestamp |
| value | Union[float, str] | Computed value |

## Common DSL patterns

```python
# Arithmetic on two series
F.dsl("a+b")([series_1, series_2])

# Conditional skip
F.dsl("a % 2 == 0 ? a : skip")(series_1)

# Null/inf handling
F.dsl("isnan(b) ? a : b")([series_1, series_2])
F.dsl("isfinite(a) ? a : b")([series_1, series_2])

# Variable assignment
F.dsl("var x = a * 2; x += 10; x - b")([series_1, series_2])
```

**See also:** `interpolate()`, `udf()`
