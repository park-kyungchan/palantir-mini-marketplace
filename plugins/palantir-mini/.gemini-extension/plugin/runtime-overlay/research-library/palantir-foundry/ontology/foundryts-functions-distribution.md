---
source: https://www.palantir.com/docs/foundry/foundryts/functions-distribution/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.distribution
---

# foundryts.functions.distribution

```python
foundryts.functions.distribution(start=None, end=None, start_value=None, end_value=None, bins=None)
```

Returns a function that evaluates the distribution of one or more time series. Points are partitioned into bins of equal value width. Can be applied to a single series or a `NodeCollection` (union of values).

**Parameters:**
- `start` — timestamp inclusive lower bound (default: earliest in series)
- `end` — timestamp exclusive upper bound (default: latest in series)
- `start_value` — value lower bound inclusive (default: min value)
- `end_value` — value upper bound exclusive (default: max value)
- `bins` (int) — number of bins (default: 10)

**Returns:** `(Union[FunctionNode, NodeCollection]) -> SummarizerNode`

**Note:** Only applicable to numeric series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| start_timestamp | datetime | Distribution start (inclusive) |
| end_timestamp | datetime | Distribution end (exclusive) |
| start | float | Value range lower bound |
| end | float | Value range upper bound |
| delta | float | Bin width (fixed for all bins) |
| distribution_values.start | float | Bin start value |
| distribution_values.end | float | Bin end value |
| distribution_values.count | int | Points in this bin |

**See also:** `statistics()`, `scatter()`
