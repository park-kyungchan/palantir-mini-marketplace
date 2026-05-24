---
source: https://www.palantir.com/docs/foundry/foundryts/functions-cumulative-aggregate/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.cumulative_aggregate
---

# foundryts.functions.cumulative_aggregate

```python
foundryts.functions.cumulative_aggregate(aggregate)
```

Returns a function that computes the cumulative aggregate of all values in a single time series. For each point, considers all preceding points up to and including the current point.

**Parameter:** `aggregate` (str) — one of: `min`, `max`, `count`, `sum`, `product`, `mean`, `standard_deviation`, `difference`, `percent_change`, `first`, `last`.

**Returns:** `(FunctionNode) -> FunctionNode`

**Note:** Only applicable to numeric series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Point timestamp |
| value | Union[float, str] | Cumulative aggregate value |

## Example

```python
>>> series = F.points((2, 10.0), (5, 20.0), (6, 30.0), name="series-1")
>>> F.cumulative_aggregate("mean")(series).to_pandas()
#  timestamps: 2, 5, 6   values: 10.0, 15.0, 20.0
```

**See also:** `rolling_aggregate()`, `periodic_aggregate()`
