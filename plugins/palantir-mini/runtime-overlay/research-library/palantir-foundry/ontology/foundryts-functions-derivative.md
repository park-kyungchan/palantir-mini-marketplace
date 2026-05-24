---
source: https://www.palantir.com/docs/foundry/foundryts/functions-derivative/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.derivative
---

# foundryts.functions.derivative

```python
foundryts.functions.derivative()
```

Returns a function that calculates the per-second value change for a single time series. Starting from the second point, outputs the derivative of the previous point's value scaled to a per-second rate.

**Returns:** `(FunctionNode) -> FunctionNode`

**Note:** Only applicable to numeric series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Point timestamp |
| value | float | Per-second derivative value |

## Example

```python
>>> series = F.points((100, 100.0), (120, 200.0), (130, 230.0), name="series")
>>> F.derivative()(series).to_pandas()
# timestamps: 120, 130   values: 5e9, 3e9  (per-second rates)
```

**See also:** `integral()`
