---
source: https://www.palantir.com/docs/foundry/foundryts/functions-integral/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.integral
---

# foundryts.functions.integral

```python
foundryts.functions.integral(method='LINEAR')
```

Returns a function that calculates the per-second cumulative integral for a single time series. For each point `(t_i, v_i)`, outputs the cumulative integral of all preceding points including the current. Uses Riemann sum estimation.

**Parameter:** `method` (str, optional) — one of:

| Method | Description |
|--------|-------------|
| `LHS` | Left-Hand Sum — value at interval start; underestimates for increasing trends |
| `RHS` | Right-Hand Sum — value at interval end; overestimates for increasing trends |
| `LINEAR` (default) | Trapezoidal Rule — averages start and end; balanced for fluctuating trends |

**Returns:** `(FunctionNode) -> FunctionNode`

**Note:** Only applicable to numeric series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Point timestamp |
| value | float | Cumulative per-second integral |

## Example

```python
>>> series = F.points((1000, 1.0), (3000, 3.0), (5000, 0.0), (6000, 5.0), (8000, -7.0))
>>> F.integral(method="LINEAR")(series).to_pandas()
# values: 0.0, 0.000004, 0.000007, 0.000009, 0.000007
```

**See also:** `derivative()`
